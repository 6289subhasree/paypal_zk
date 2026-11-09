"""ZK Pay: payment requests and the proof-gated authorization step (FR-08, FR-09)."""
import time
from datetime import timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import zk
from ..audit import audit
from ..config import get_settings
from ..db import get_db
from ..models import Credential, PaymentRequest, Proof, Transaction, UsedNullifier, User, utcnow
from ..security import current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])
settings = get_settings()

# Human-readable reasons, shown in the UI without exposing witness values.
REJECTIONS = {
    "invalid_proof": "The proof failed cryptographic verification (it was altered or malformed).",
    "untrusted_issuer": "The credential behind this proof was not signed by a trusted issuer.",
    "wrong_verifier": "The proof was generated for a different verifier.",
    "wrong_payment": "The proof is bound to a different payment request.",
    "stale_proof": "The proof's timestamp is too old or in the future. Generate a fresh proof.",
    "wrong_date": "The proof was made for a different calendar date. Generate a fresh proof.",
    "wrong_age_requirement": "The proof doesn't cover this request's age requirement.",
    "revoked": "The credential behind this proof has been revoked.",
    "replayed": "This proof has already been used. Each payment needs a fresh proof.",
}


class CreateRequestIn(BaseModel):
    amount: Decimal = Field(gt=0, le=10000, decimal_places=2)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    description: str = Field(default="", max_length=200)
    min_age: int = Field(default=0, ge=0, le=99)  # 18 for age-restricted goods, 0 for none


class AuthorizeIn(BaseModel):
    proof: dict
    public_signals: list[str] = Field(min_length=9, max_length=9)


def today_ymd(offset_days: int = 0) -> int:
    d = (utcnow() + timedelta(days=offset_days)).astimezone(timezone.utc)
    return d.year * 10000 + d.month * 100 + d.day


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
    return request_out(pr, db)


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

    # 1. Cryptographic verification against the circuit's verification key
    result = zk.verify_proof(body.proof, body.public_signals)
    if not result["valid"]:
        return _reject(db, user, pr, body, "invalid_proof")
    s = result["signals"]

    # 2. Public inputs must match what this verifier expects
    issuer = zk.issuer_public_key()
    if (s["issuer_ax"], s["issuer_ay"]) != (issuer["ax"], issuer["ay"]):
        return _reject(db, user, pr, body, "untrusted_issuer", s["nullifier"])
    if s["verifier_id"] != str(settings.verifier_id):
        return _reject(db, user, pr, body, "wrong_verifier", s["nullifier"])
    if s["payment_challenge"] != pr.challenge:
        return _reject(db, user, pr, body, "wrong_payment", s["nullifier"])
    # The circuit proves expires_at > now; this check makes sure `now` really is now.
    server_now = int(time.time())
    if not (server_now - settings.proof_max_age_seconds <= int(s["now"]) <= server_now + 60):
        return _reject(db, user, pr, body, "stale_proof", s["nullifier"])
    # The age check uses a calendar date; allow one day either side for time zones.
    if int(s["today"]) not in {today_ymd(-1), today_ymd(), today_ymd(1)}:
        return _reject(db, user, pr, body, "wrong_date", s["nullifier"])
    if s["min_age"] != str(pr.min_age or 0):
        return _reject(db, user, pr, body, "wrong_age_requirement", s["nullifier"])

    # 3. Revocation: compare the verifier-scoped tag against revoked credentials
    if db.query(Credential).filter_by(revocation_tag=s["revocation_tag"], status="revoked").first():
        return _reject(db, user, pr, body, "revoked", s["nullifier"])

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

    cred = db.query(Credential).filter_by(revocation_tag=s["revocation_tag"]).first()
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
        item["transaction"] = None if tx is None else {
            "provider_order_id": tx.provider_order_id, "provider_capture_id": tx.provider_capture_id,
            "status": tx.status, "environment": tx.environment,
            "captured_at": _aware(tx.captured_at).isoformat() if tx.captured_at else None,
        }
        out.append(item)
    return out
