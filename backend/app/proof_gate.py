"""The shared ZK verifier used by every proof-gated action (payments and payouts).

check_proof runs every check except replay protection, which each caller records
in its own table so a nullifier is tied to the action it unlocked.
"""
import time
from datetime import timedelta, timezone

from sqlalchemy.orm import Session

from . import zk
from .config import get_settings
from .models import Credential, utcnow

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


def today_ymd(offset_days: int = 0) -> int:
    d = (utcnow() + timedelta(days=offset_days)).astimezone(timezone.utc)
    return d.year * 10000 + d.month * 100 + d.day


def check_proof(db: Session, proof: dict, public_signals: list[str], challenge: str,
                min_age: int = 0) -> tuple[dict | None, str | None]:
    """Return (signals, None) if the proof passes, or (signals or None, rejection_code)."""
    # 1. Cryptographic verification against the circuit's verification key
    result = zk.verify_proof(proof, public_signals)
    if not result["valid"]:
        return None, "invalid_proof"
    s = result["signals"]

    # 2. Public inputs must match what this verifier expects
    issuer = zk.issuer_public_key()
    if (s["issuer_ax"], s["issuer_ay"]) != (issuer["ax"], issuer["ay"]):
        return s, "untrusted_issuer"
    if s["verifier_id"] != str(settings.verifier_id):
        return s, "wrong_verifier"
    if s["payment_challenge"] != challenge:
        return s, "wrong_payment"
    # The circuit proves expires_at > now; this check makes sure `now` really is now.
    server_now = int(time.time())
    if not (server_now - settings.proof_max_age_seconds <= int(s["now"]) <= server_now + 60):
        return s, "stale_proof"
    # The age check uses a calendar date; allow one day either side for time zones.
    if int(s["today"]) not in {today_ymd(-1), today_ymd(), today_ymd(1)}:
        return s, "wrong_date"
    if s["min_age"] != str(min_age or 0):
        return s, "wrong_age_requirement"

    # 3. Revocation: compare the verifier-scoped tag against revoked credentials
    if db.query(Credential).filter_by(revocation_tag=s["revocation_tag"], status="revoked").first():
        return s, "revoked"
    return s, None


def credential_for(db: Session, signals: dict) -> Credential | None:
    return db.query(Credential).filter_by(revocation_tag=signals["revocation_tag"]).first()
