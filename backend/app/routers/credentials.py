"""ZK Passport: credential issuance, status and revocation (FR-06)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import zk
from ..audit import audit
from ..config import get_settings
from ..db import get_db
from ..models import Credential, KycSession, User, utcnow
from ..security import current_user, require_reviewer

router = APIRouter(prefix="/api/credentials", tags=["credentials"])
settings = get_settings()
CIRCUIT_VERSION = zk.CIRCUIT_VERSION


class IssueIn(BaseModel):
    # Poseidon(holder_secret), computed in the holder's browser. The secret never leaves it.
    holder_commitment: str = Field(pattern=r"^[0-9]{1,78}$")


def credential_out(c: Credential, include_witness_fields: bool = False) -> dict:
    out = {
        "id": c.id,
        "issuer_id": c.issuer_id,
        "credential_type": c.credential_type,
        "claims": {"kyc_approved": bool(c.kyc_approved), "can_prove_age": c.birth_date is not None},
        "issued_at": c.issued_at.isoformat(),
        "expires_at": c.expires_at.isoformat(),
        "status": c.status,
        "circuit_version": c.circuit_version,
    }
    if include_witness_fields:
        # Returned only to the holder so their browser can build the proof.
        out["proof_material"] = {
            "credentialId": c.credential_reference,
            "holderCommitment": c.holder_commitment,
            "kycApproved": c.kyc_approved,
            "expiresAt": int(c.expires_at.timestamp()),
            "birthDate": c.birth_date,
            "signature": c.signature_reference,
        }
    return out


@router.get("/issuer")
def issuer_info():
    return {"issuer_id": settings.issuer_id, "public_key": zk.issuer_public_key(),
            "verifier_id": str(settings.verifier_id), "circuit_version": CIRCUIT_VERSION}


@router.post("/issue")
def issue(body: IssueIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    session = (db.query(KycSession).filter_by(user_id=user.id)
               .order_by(KycSession.started_at.desc()).first())
    if session is None or session.status != "approved":
        raise HTTPException(403, "A credential can only be issued after an approved KYC session")

    dob = (session.declared or {}).get("date_of_birth")
    if not dob:
        raise HTTPException(409, "This KYC session has no date of birth on record")
    birth_date = int(dob.replace("-", ""))  # YYYY-MM-DD -> YYYYMMDD

    expires_at = utcnow() + timedelta(days=settings.credential_ttl_days)
    fields = {
        "credentialId": zk.random_field(),
        "holderCommitment": body.holder_commitment,
        "kycApproved": 1,
        "expiresAt": int(expires_at.timestamp()),
        "birthDate": birth_date,
    }
    signature = zk.sign_credential(fields)

    # Revoke older active credentials for this user: one live Passport at a time.
    for old in db.query(Credential).filter_by(user_id=user.id, status="active"):
        old.status = "revoked"

    cred = Credential(
        user_id=user.id, kyc_session_id=session.id, issuer_id=settings.issuer_id,
        credential_reference=fields["credentialId"], holder_commitment=body.holder_commitment,
        kyc_approved=1, expires_at=expires_at, signature_reference=signature,
        revocation_tag=zk.revocation_tag(fields["credentialId"], settings.verifier_id),
        circuit_version=CIRCUIT_VERSION, birth_date=birth_date,
    )
    db.add(cred)
    db.flush()
    audit(db, user.id, "credential.issued", "credential", cred.id, kyc_session_id=session.id)
    db.commit()
    return credential_out(cred, include_witness_fields=True)


@router.get("/me")
def my_credentials(user: User = Depends(current_user), db: Session = Depends(get_db)):
    creds = db.query(Credential).filter_by(user_id=user.id).order_by(Credential.issued_at.desc()).all()
    return [credential_out(c, include_witness_fields=c.status == "active") for c in creds]


@router.get("/{credential_id}/status")
def status(credential_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Credential, credential_id)
    if c is None or (c.user_id != user.id and user.role != "reviewer"):
        raise HTTPException(404, "Credential not found")
    expired = c.expires_at.replace(tzinfo=c.expires_at.tzinfo or utcnow().tzinfo) <= utcnow()
    return {"id": c.id, "status": "expired" if expired and c.status == "active" else c.status}


@router.post("/{credential_id}/revoke")
def revoke(credential_id: str, reviewer: User = Depends(require_reviewer), db: Session = Depends(get_db)):
    c = db.get(Credential, credential_id)
    if c is None:
        raise HTTPException(404, "Credential not found")
    c.status = "revoked"
    audit(db, reviewer.id, "credential.revoked", "credential", c.id)
    db.commit()
    return {"id": c.id, "status": c.status}
