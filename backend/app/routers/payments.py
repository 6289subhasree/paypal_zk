"""ZK Pay: payment requests and the proof-gated authorization step (FR-08, FR-09)."""
from datetime import timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import zk
from ..audit import audit
from ..config import get_settings
from ..db import get_db
from ..models import PaymentRequest, Proof, Transaction, UsedNullifier, User, utcnow
from ..proof_gate import REJECTIONS, check_proof, credential_for, today_ymd
from ..security import current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])
settings = get_settings()



class CreateRequestIn(BaseModel):
    amount: Decimal = Field(gt=0, le=10000, decimal_places=2)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    description: str = Field(default="", max_length=200)
    min_age: int = Field(default=0, ge=0, le=99)  # 18 for age-restricted goods, 0 for none


class AuthorizeIn(BaseModel):
    proof: dict
    public_signals: list[str] = Field(min_length=9, max_length=9)


def transaction_out(tx: Transaction) -> dict:
    iso = lambda d: _aware(d).isoformat() if d else None  # noqa: E731
    return {
        "id": tx.id, "payment_request_id": tx.payment_request_id, "provider": tx.provider,
        "provider_order_id": tx.provider_order_id, "provider_capture_id": tx.provider_capture_id,
        "amount": f"{Decimal(tx.amount):.2f}", "currency": tx.currency,
        "status": tx.status, "environment": tx.environment,
        "created_at": iso(tx.created_at), "captured_at": iso(tx.captured_at),
        "refund_id": tx.refund_id, "refund_status": tx.refund_status, "refunded_at": iso(tx.refunded_at),
    }


def _aware(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=utcnow().tzinfo)


def request_out(pr: PaymentRequest, db: Session) -> dict:
    recipient = db.get(User, pr.recipient_user_id)
    status = pr.status
    if status == "open" and _aware(pr.expires_at) <= utcnow():
        status = "expired"
    return {
        "id": pr.id,
        "amount": f"{Decimal(pr.amount):.2f}",
        "currency": pr.currency,
        "description": pr.description,
        "recipient": {"id": recipient.id, "display_name": recipient.display_name},
        "payer_user_id": pr.payer_user_id,
        "status": status,
        "expires_at": _aware(pr.expires_at).isoformat(),
        "created_at": _aware(pr.created_at).isoformat(),
        # Everything the holder's browser needs to build a payment-bound proof:
        "challenge": pr.challenge,
        "verifier_id": str(settings.verifier_id),
        "issuer_public_key": zk.issuer_public_key(),
        "min_age": pr.min_age or 0,
        "today": today_ymd(),  # YYYYMMDD in UTC, used by the age check
    }


@router.post("/requests")
def create_request(body: CreateRequestIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pr = PaymentRequest(
        recipient_user_id=user.id, amount=body.amount, currency=body.currency,
        description=body.description, challenge=zk.random_field(), min_age=body.min_age,
        expires_at=utcnow() + timedelta(minutes=settings.payment_request_ttl_minutes),
    )
    db.add(pr)
    db.flush()
    audit(db, user.id, "payment_request.created", "payment_request", pr.id,
          amount=str(body.amount), currency=body.currency, min_age=body.min_age)
    db.commit()
    return request_out(pr, db)


@router.get("/requests/{request_id}")
def get_request(request_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pr = db.get(PaymentRequest, request_id)
    if pr is None:
        raise HTTPException(404, "Payment request not found")
    out = request_out(pr, db)
    if user.id in (pr.recipient_user_id, pr.payer_user_id):
        tx = (db.query(Transaction).filter_by(payment_request_id=pr.id)
              .order_by(Transaction.created_at.desc()).first())
        out["transaction"] = transaction_out(tx) if tx else None
    return out


def _reject(db: Session, user: User, pr: PaymentRequest, body: AuthorizeIn, code: str, nullifier=None):
    db.add(Proof(user_id=user.id, payment_request_id=pr.id, proof_reference=body.proof,
                 public_inputs=body.public_signals, nullifier=nullifier,
                 verification_status="rejected", rejection_code=code))
    audit(db, user.id, "proof.rejected", "payment_request", pr.id, code=code)
    db.commit()
    return {"authorized": False, "code": code, "reason": REJECTIONS[code]}


@router.post("/requests/{request_id}/authorize")
def authorize(request_id: str, body: AuthorizeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pr = db.get(PaymentRequest, request_id)
    if pr is None:
        raise HTTPException(404, "Payment request not found")
    if pr.recipient_user_id == user.id:
        raise HTTPException(400, "You cannot pay your own payment request")
    # Expired or cancelled requests stop here. Already-authorized or paid requests go on
    # through verification so a reused proof is reported as a replay, not a vague error.
    if pr.status in ("expired", "cancelled") or (pr.status == "open" and _aware(pr.expires_at) <= utcnow()):
        raise HTTPException(409, "This payment request is no longer open")

    s, code = check_proof(db, body.proof, body.public_signals, pr.challenge, pr.min_age or 0)
    if code:
        return _reject(db, user, pr, body, code, s["nullifier"] if s else None)

    # 4. Replay protection: the nullifier may authorize exactly one payment
    if db.get(UsedNullifier, s["nullifier"]):
        return _reject(db, user, pr, body, "replayed", s["nullifier"])
    try:
        db.add(UsedNullifier(nullifier=s["nullifier"], payment_request_id=pr.id))
        db.flush()
    except IntegrityError:
        db.rollback()
        return _reject(db, user, pr, body, "replayed", s["nullifier"])
    if pr.status != "open":  # defensive: an unused nullifier can't reach a non-open request
        db.rollback()
        raise HTTPException(409, "This payment request is no longer open")

    cred = credential_for(db, s)
    proof = Proof(user_id=user.id, credential_id=cred.id if cred else None, payment_request_id=pr.id,
                  proof_reference=body.proof, public_inputs=body.public_signals,
                  nullifier=s["nullifier"], verification_status="accepted")
    db.add(proof)
    pr.status = "authorized"
    pr.payer_user_id = user.id
    db.flush()
    audit(db, user.id, "proof.accepted", "payment_request", pr.id, proof_id=proof.id)
    db.commit()
    return {"authorized": True, "proof_id": proof.id, "request": request_out(pr, db)}


@router.get("/history")
def history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    reqs = (db.query(PaymentRequest)
            .filter((PaymentRequest.recipient_user_id == user.id) | (PaymentRequest.payer_user_id == user.id))
            .order_by(PaymentRequest.created_at.desc()).limit(50).all())
    out = []
    for pr in reqs:
        tx = db.query(Transaction).filter_by(payment_request_id=pr.id).order_by(Transaction.created_at.desc()).first()
        item = request_out(pr, db)
        item["role"] = "recipient" if pr.recipient_user_id == user.id else "payer"
        item["transaction"] = transaction_out(tx) if tx else None
        out.append(item)
    return out
