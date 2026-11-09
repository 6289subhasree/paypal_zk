
from app import zk
from tests.helpers import approve_kyc

HOLDER_SECRET = "123456789"


def commitment(secret: str) -> str:
    return zk.call("holder-commitment", holderSecret=secret)["commitment"]


def test_no_credential_without_approved_kyc(client, make_user):
    u = make_user()
    r = client.post("/api/credentials/issue", json={"holder_commitment": commitment(HOLDER_SECRET)}, headers=u["headers"])
    assert r.status_code == 403


def test_issue_signed_credential(client, make_user):
    u = make_user()
    approve_kyc(u["user"]["id"])
    r = client.post("/api/credentials/issue", json={"holder_commitment": commitment(HOLDER_SECRET)}, headers=u["headers"])
    assert r.status_code == 200, r.text
    cred = r.json()
    pm = cred["proof_material"]
    assert cred["claims"] == {"kyc_approved": True}
    assert zk.verify_signature({k: pm[k] for k in ("credentialId", "holderCommitment", "kycApproved", "expiresAt")}, pm["signature"])
    # Tampering with any signed field breaks the signature
    assert not zk.verify_signature({**{k: pm[k] for k in ("credentialId", "holderCommitment", "kycApproved")}, "expiresAt": pm["expiresAt"] + 1}, pm["signature"])


def test_reissue_revokes_previous(client, make_user):
    u = make_user()
    approve_kyc(u["user"]["id"])
    body = {"holder_commitment": commitment(HOLDER_SECRET)}
    first = client.post("/api/credentials/issue", json=body, headers=u["headers"]).json()
    client.post("/api/credentials/issue", json=body, headers=u["headers"])
    statuses = {c["id"]: c["status"] for c in client.get("/api/credentials/me", headers=u["headers"]).json()}
    assert statuses[first["id"]] == "revoked"
    assert list(statuses.values()).count("active") == 1


def test_only_reviewer_can_revoke(client, make_user):
    u = make_user()
    approve_kyc(u["user"]["id"])
    cred = client.post("/api/credentials/issue", json={"holder_commitment": commitment(HOLDER_SECRET)}, headers=u["headers"]).json()
    assert client.post(f"/api/credentials/{cred['id']}/revoke", headers=u["headers"]).status_code == 403
    rev = make_user("reviewer")
    assert client.post(f"/api/credentials/{cred['id']}/revoke", headers=rev["headers"]).json()["status"] == "revoked"


def test_reloaded_proof_material_still_matches_signature(client, make_user):
    # The browser re-fetches proof material from /me before proving. It must be
    # byte-identical to what was signed, whatever the server's local timezone.
    from datetime import timezone

    from app.db import SessionLocal
    from app.models import Credential

    u = make_user()
    approve_kyc(u["user"]["id"])
    issued = client.post("/api/credentials/issue", json={"holder_commitment": commitment(HOLDER_SECRET)}, headers=u["headers"]).json()
    reloaded = next(c for c in client.get("/api/credentials/me", headers=u["headers"]).json() if c["id"] == issued["id"])
    pm = reloaded["proof_material"]
    assert pm == issued["proof_material"]
    assert zk.verify_signature({k: pm[k] for k in ("credentialId", "holderCommitment", "kycApproved", "expiresAt")}, pm["signature"])
    with SessionLocal() as db:
        assert db.get(Credential, issued["id"]).expires_at.tzinfo == timezone.utc
