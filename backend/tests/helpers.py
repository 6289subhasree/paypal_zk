from app.db import SessionLocal
from app.models import KycSession, utcnow


def approve_kyc(user_id: str) -> str:
    """Test shortcut: mark a KYC session approved without the full KYC flow."""
    with SessionLocal() as db:
        s = KycSession(user_id=user_id, status="approved", completed_at=utcnow(), reviewed_at=utcnow())
        db.add(s)
        db.commit()
        return s.id


import time

from app import zk


def holder_with_credential(client, make_user, secret: str = "987654321"):
    u = make_user()
    approve_kyc(u["user"]["id"])
    commitment = zk.call("holder-commitment", holderSecret=secret)["commitment"]
    cred = client.post("/api/credentials/issue", json={"holder_commitment": commitment}, headers=u["headers"]).json()
    u["secret"], u["credential"] = secret, cred
    return u


def make_proof(holder, request: dict, now: int | None = None, challenge: str | None = None) -> dict:
    out = zk.call(
        "prove",
        issuerPub=request["issuer_public_key"],
        now=now if now is not None else int(time.time()),
        paymentChallenge=challenge or request["challenge"],
        verifierId=request["verifier_id"],
        holderSecret=holder["secret"],
        credential=holder["credential"]["proof_material"],
    )
    return {"proof": out["proof"], "public_signals": out["publicSignals"]}
