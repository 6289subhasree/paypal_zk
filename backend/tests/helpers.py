from app.db import SessionLocal
from app.models import KycSession, utcnow


def approve_kyc(user_id: str, dob: str = "1999-08-14") -> str:
    """Test shortcut: mark a KYC session approved without the full KYC flow."""
    with SessionLocal() as db:
        s = KycSession(user_id=user_id, status="approved", completed_at=utcnow(), reviewed_at=utcnow(),
                       declared={"full_name": "Test Holder", "date_of_birth": dob})
        db.add(s)
        db.commit()
        return s.id


import time

from app import zk


def holder_with_credential(client, make_user, secret: str = "987654321", dob: str = "1999-08-14"):
    u = make_user()
    approve_kyc(u["user"]["id"], dob)
    commitment = zk.call("holder-commitment", holderSecret=secret)["commitment"]
    cred = client.post("/api/credentials/issue", json={"holder_commitment": commitment}, headers=u["headers"]).json()
    u["secret"], u["credential"] = secret, cred
    return u


def make_proof(holder, request: dict, now: int | None = None, challenge: str | None = None,
               today: int | None = None, min_age: int | None = None) -> dict:
    out = zk.call(
        "prove",
        issuerPub=request["issuer_public_key"],
        now=now if now is not None else int(time.time()),
        paymentChallenge=challenge or request["challenge"],
        verifierId=request["verifier_id"],
        holderSecret=holder["secret"],
        credential=holder["credential"]["proof_material"],
        today=today if today is not None else request["today"],
        minAge=min_age if min_age is not None else request["min_age"],
    )
    return {"proof": out["proof"], "public_signals": out["publicSignals"]}
