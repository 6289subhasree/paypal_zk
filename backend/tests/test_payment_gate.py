import time

from tests.helpers import holder_with_credential, make_proof


def new_request(client, make_user, amount="10.00"):
    merchant = make_user()
    r = client.post("/api/payments/requests", json={"amount": amount, "currency": "USD", "description": "Demo"},
                    headers=merchant["headers"])
    assert r.status_code == 200, r.text
    return merchant, r.json()


def authorize(client, payer, req, body):
    return client.post(f"/api/payments/requests/{req['id']}/authorize", json=body, headers=payer["headers"]).json()


def test_valid_payment_bound_proof_unlocks(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    res = authorize(client, payer, req, make_proof(payer, req))
    assert res["authorized"] is True
    assert res["request"]["status"] == "authorized"


def test_replayed_proof_rejected(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    body = make_proof(payer, req)
    assert authorize(client, payer, req, body)["authorized"] is True
    # Resubmitting the same proof is caught by the nullifier
    assert authorize(client, payer, req, body)["code"] == "replayed"
    # So is a freshly generated proof for the same payment: the nullifier is deterministic
    assert authorize(client, payer, req, make_proof(payer, req))["code"] == "replayed"


def test_proof_for_other_payment_rejected(client, make_user):
    _, req_a = new_request(client, make_user)
    _, req_b = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    res = authorize(client, payer, req_b, make_proof(payer, req_a))
    assert res["code"] == "wrong_payment"


def test_tampered_proof_rejected(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    body = make_proof(payer, req)
    body["proof"]["pi_a"][0] = str(int(body["proof"]["pi_a"][0]) + 1)
    assert authorize(client, payer, req, body)["code"] == "invalid_proof"


def test_stale_proof_rejected(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    res = authorize(client, payer, req, make_proof(payer, req, now=int(time.time()) - 3600))
    assert res["code"] == "stale_proof"


def test_revoked_credential_rejected(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    reviewer = make_user("reviewer")
    client.post(f"/api/credentials/{payer['credential']['id']}/revoke", headers=reviewer["headers"])
    assert authorize(client, payer, req, make_proof(payer, req))["code"] == "revoked"


def test_cannot_pay_own_request(client, make_user):
    merchant = holder_with_credential(client, make_user)
    req = client.post("/api/payments/requests", json={"amount": "5.00"}, headers=merchant["headers"]).json()
    r = client.post(f"/api/payments/requests/{req['id']}/authorize", json=make_proof(merchant, req), headers=merchant["headers"])
    assert r.status_code == 400


def test_rejections_do_not_leak_witness(client, make_user):
    _, req = new_request(client, make_user)
    payer = holder_with_credential(client, make_user)
    from app.db import SessionLocal
    from app.models import AuditLog, Proof
    authorize(client, payer, req, make_proof(payer, req))
    with SessionLocal() as db:
        dumped = str([(p.public_inputs, p.proof_reference) for p in db.query(Proof)]) + \
                 str([a.meta for a in db.query(AuditLog)])
    assert payer["secret"] not in dumped
    assert payer["credential"]["proof_material"]["credentialId"] not in dumped
