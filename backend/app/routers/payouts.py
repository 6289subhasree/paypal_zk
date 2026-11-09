"""ZK Payouts: send money with PayPal Payouts only after the recipient proves KYC.

The sender creates a payout. The recipient opens it, generates a proof bound to
the payout's challenge in their browser, and names the PayPal account to receive
it. The backend verifies the proof with the same checks as payments, records the
nullifier against this payout, and only then calls the Payouts API.
"""
from datetime import timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from .. import paypal, zk
from ..audit import audit
from ..config import get_settings
from ..db import get_db
from ..models import Payout, User, utcnow
from ..proof_gate import REJECTIONS, check_proof, today_ymd
from ..security import current_user
from .paypal import HINTS

router = APIRouter(prefix="/api/payouts", tags=["payouts"])
settings = get_settings()
PAYOUT_TTL_DAYS = 7


class CreatePayoutIn(BaseModel):
    amount: Decimal = Field(gt=0, le=5000, decimal_places=2)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    note: str = Field(default="", max_length=200)
    min_age: int = Field(default=0, ge=0, le=99)


class ClaimIn(BaseModel):
    proof: dict
    public_signals: list[str] = Field(min_length=9, max_length=9)
    paypal_email: EmailStr


def _aware(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=utcnow().tzinfo)


def payout_out(p: Payout, db: Session, viewer: User) -> dict:
    sender = db.get(User, p.sender_user_id)
    status = p.status
    if status == "awaiting_proof" and _aware(p.expires_at) <= utcnow():
        status = "expired"
    out = {
        "id": p.id,
        "amount": f"{Decimal(p.amount):.2f}",
        "currency": p.currency,
        "note": p.note,
        "sender": {"id": sender.id, "display_name": sender.display_name},
        "recipient_user_id": p.recipient_user_id,
        "status": status,
        "environment": p.environment,
        "expires_at": _aware(p.expires_at).isoformat(),
        "created_at": _aware(p.created_at).isoformat(),
        "sent_at": _aware(p.sent_at).isoformat() if p.sent_at else None,
        "provider_batch_id": p.provider_batch_id,
        "provider_item_status": p.provider_item_status,
        # Proof inputs, in the same shape a payment request uses:
        "challenge": p.challenge,
        "verifier_id": str(settings.verifier_id),
        "issuer_public_key": zk.issuer_public_key(),
        "min_age": p.min_age or 0,
        "today": today_ymd(),
    }
    if viewer.id in (p.sender_user_id, p.recipient_user_id):
        out["receiver_email"] = p.receiver_email
    return out


def _paypal(fn, *args, db: Session, user: User, payout: Payout, action: str):
    try:
        return fn(*args)
    except paypal.PayPalError as e:
        audit(db, user.id, f"paypal.payout_{action}_failed", "payout", payout.id, issue=e.issue, debug_id=e.debug_id)
        db.commit()
        hint = HINTS.get(e.issue or "", "")
        raise HTTPException(502, {"message": f"{e} {hint}".strip(), "issue": e.issue, "debug_id": e.debug_id})


@router.post("")
def create(body: CreatePayoutIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = Payout(sender_user_id=user.id, amount=body.amount, currency=body.currency, note=body.note,
               min_age=body.min_age, challenge=zk.random_field(), environment=settings.paypal_mode,
               expires_at=utcnow() + timedelta(days=PAYOUT_TTL_DAYS))
    db.add(p)
    db.flush()
    audit(db, user.id, "payout.created", "payout", p.id, amount=str(body.amount), currency=body.currency)
    db.commit()
    return payout_out(p, db, user)


@router.get("")
def mine(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(Payout)
            .filter((Payout.sender_user_id == user.id) | (Payout.recipient_user_id == user.id))
            .order_by(Payout.created_at.desc()).limit(50).all())
    return [{**payout_out(p, db, user), "role": "sender" if p.sender_user_id == user.id else "recipient"} for p in rows]


@router.get("/{payout_id}")
def get_one(payout_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(Payout, payout_id)
    if p is None:
        raise HTTPException(404, "Payout not found")
    return payout_out(p, db, user)


@router.post("/{payout_id}/claim")
def claim(payout_id: str, body: ClaimIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(Payout, payout_id)
    if p is None:
        raise HTTPException(404, "Payout not found")
    if p.sender_user_id == user.id:
        raise HTTPException(400, "You can't claim your own payout")
    if p.status == "awaiting_proof" and _aware(p.expires_at) <= utcnow():
        raise HTTPException(409, "This payout has expired")

    s, code = check_proof(db, body.proof, body.public_signals, p.challenge, p.min_age or 0)
    if not code and (p.nullifier == s["nullifier"] or db.query(Payout).filter_by(nullifier=s["nullifier"]).first()):
        code = "replayed"
    if code:
        audit(db, user.id, "payout.proof_rejected", "payout", p.id, code=code)
        db.commit()
        return {"released": False, "code": code, "reason": REJECTIONS[code]}
    if p.status != "awaiting_proof":
        raise HTTPException(409, "This payout has already been claimed")

    # Lock the payout to this proof and recipient before calling PayPal.
    p.nullifier, p.recipient_user_id, p.receiver_email, p.status = (
        s["nullifier"], user.id, body.paypal_email.lower(), "sending")
    audit(db, user.id, "payout.proof_accepted", "payout", p.id)
    db.commit()

    try:
        result = _paypal(paypal.create_payout, p.id, p.receiver_email, f"{Decimal(p.amount):.2f}", p.currency,
                         p.note, db=db, user=user, payout=p, action="create")
    except HTTPException:
        # PayPal refused: reopen the payout so the recipient can fix the cause and claim again.
        # The batch id stays the same, so PayPal itself blocks a duplicate payout.
        p.status, p.nullifier, p.recipient_user_id, p.receiver_email = "awaiting_proof", None, None, None
        db.commit()
        raise
    header = result.get("batch_header") or {}
    if not header.get("payout_batch_id"):
        p.status = "failed"
        db.commit()
        raise HTTPException(502, {"message": "PayPal did not return a payout batch"})
    p.provider_batch_id = header["payout_batch_id"]
    p.provider_item_status = header.get("batch_status")
    p.status, p.sent_at = "sent", utcnow()
    audit(db, user.id, "payout.sent", "payout", p.id, batch_id=p.provider_batch_id)
    db.commit()
    return {"released": True, "payout": payout_out(p, db, user)}


@router.post("/{payout_id}/refresh")
def refresh(payout_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Payouts settle asynchronously; ask PayPal for the item's latest status."""
    p = db.get(Payout, payout_id)
    if p is None or user.id not in (p.sender_user_id, p.recipient_user_id):
        raise HTTPException(404, "Payout not found")
    if not p.provider_batch_id:
        return payout_out(p, db, user)
    result = _paypal(paypal.get_payout, p.provider_batch_id, db=db, user=user, payout=p, action="status")
    items = result.get("items") or []
    p.provider_item_status = (items[0].get("transaction_status") if items
                              else (result.get("batch_header") or {}).get("batch_status"))
    db.commit()
    return payout_out(p, db, user)
