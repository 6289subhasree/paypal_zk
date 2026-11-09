"""PayPal Sandbox flow with the provider mocked (no network in CI)."""
import pytest

from app import paypal
from tests.helpers import holder_with_credential, make_proof


@pytest.fixture
def fake_paypal(monkeypatch):
    calls = {"create": 0, "capture": 0}

    def create_order(ref, amount, currency, desc, save_wallet=False, return_url=""):
        calls["save_wallet"] = save_wallet
        calls["create"] += 1
        return {"id": f"ORDER-{ref[:8]}", "status": "CREATED"}

    def capture_order(order_id):
        calls["capture"] += 1
        return calls["capture_response"](order_id)

    calls["capture_response"] = None
    monkeypatch.setattr(paypal, "create_order", create_order)
    monkeypatch.setattr(paypal, "capture_order", capture_order)
    return calls


def completed(ref, amount="10.00", currency="USD"):
    return lambda order_id: {"id": order_id, "status": "COMPLETED", "purchase_units": [{
        "reference_id": ref,
        "payments": {"captures": [{"id": "CAP-123", "status": "COMPLETED",
                                   "amount": {"value": amount, "currency_code": currency}}]}}]}


def authorized_request(client, make_user):
    merchant = make_user()
    req = client.post("/api/payments/requests", json={"amount": "10.00"}, headers=merchant["headers"]).json()
    payer = holder_with_credential(client, make_user)
    res = client.post(f"/api/payments/requests/{req['id']}/authorize", json=make_proof(payer, req), headers=payer["headers"]).json()
    assert res["authorized"]
    return merchant, payer, req


def test_checkout_locked_without_proof(client, make_user, fake_paypal):
    merchant = make_user()
    payer = make_user()
    req = client.post("/api/payments/requests", json={"amount": "10.00"}, headers=merchant["headers"]).json()
    r = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"])
    assert r.status_code == 403
    assert fake_paypal["create"] == 0


def test_only_authorized_payer_can_checkout(client, make_user, fake_paypal):
    _, _, req = authorized_request(client, make_user)
    stranger = make_user()
    r = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=stranger["headers"])
    assert r.status_code == 403


def test_create_and_capture(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    fake_paypal["capture_response"] = completed(req["id"])
    tx = client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"]).json()["transaction"]
    assert tx["status"] == "COMPLETED" and tx["provider_capture_id"] == "CAP-123" and tx["environment"] == "sandbox"
    # Duplicate capture returns stored result without calling PayPal again
    client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])
    assert fake_paypal["capture"] == 1
    hist = client.get("/api/payments/history", headers=payer["headers"]).json()
    assert hist[0]["status"] == "paid"


def test_mismatched_capture_not_marked_paid(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    fake_paypal["capture_response"] = completed(req["id"], amount="1.00")
    r = client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])
    assert r.status_code == 502
    status = client.get(f"/api/payments/requests/{req['id']}", headers=payer["headers"]).json()["status"]
    assert status == "authorized"


def test_create_order_is_idempotent(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    a = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    b = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    assert a["order_id"] == b["order_id"] and fake_paypal["create"] == 1


def test_capture_error_is_explained_and_audited(client, make_user, monkeypatch):
    from app import paypal as pp
    from app.db import SessionLocal
    from app.models import AuditLog

    monkeypatch.setattr(pp, "create_order", lambda ref, a, c, d, *rest: {"id": f"ORDER-ERR-{ref[:6]}", "status": "CREATED"})

    def fail(order_id):
        raise pp.PayPalError("The requested action could not be performed (PAYER_CANNOT_PAY: payer cannot pay)",
                             422, "dbg123", "PAYER_CANNOT_PAY")
    monkeypatch.setattr(pp, "capture_order", fail)
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    r = client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])
    assert r.status_code == 502
    assert "United States personal Sandbox account" in r.json()["detail"]["message"]
    with SessionLocal() as db:
        assert db.query(AuditLog).filter_by(action="paypal.capture_failed").count() == 1


def paid_request(client, make_user, fake_paypal):
    merchant, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"]).json()
    fake_paypal["capture_response"] = completed(req["id"])
    tx = client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"]).json()["transaction"]
    return merchant, payer, req, tx


def test_merchant_refunds_captured_payment(client, make_user, fake_paypal, monkeypatch):
    from app import paypal as pp
    calls = []
    monkeypatch.setattr(pp, "refund_capture", lambda cap, note: calls.append(cap) or {"id": "REF-1", "status": "COMPLETED"})
    merchant, payer, req, tx = paid_request(client, make_user, fake_paypal)

    # The payer can't refund themselves
    assert client.post(f"/api/paypal/transactions/{tx['id']}/refund", headers=payer["headers"]).status_code == 403

    r = client.post(f"/api/paypal/transactions/{tx['id']}/refund", headers=merchant["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["transaction"]["refund_id"] == "REF-1"
    assert calls == ["CAP-123"]
    # Refunding again doesn't call PayPal twice
    client.post(f"/api/paypal/transactions/{tx['id']}/refund", headers=merchant["headers"])
    assert calls == ["CAP-123"]
    seen = client.get(f"/api/payments/requests/{req['id']}", headers=payer["headers"]).json()
    assert seen["status"] == "refunded" and seen["transaction"]["refund_status"] == "COMPLETED"


def test_cannot_refund_uncaptured_payment(client, make_user, fake_paypal):
    merchant, payer, req = authorized_request(client, make_user)
    client.post("/api/paypal/orders", json={"payment_request_id": req["id"]}, headers=payer["headers"])
    tx = client.get(f"/api/payments/requests/{req['id']}", headers=merchant["headers"]).json()["transaction"]
    assert client.post(f"/api/paypal/transactions/{tx['id']}/refund", headers=merchant["headers"]).status_code == 409


def vaulted(ref, amount="10.00", vault_status="VAULTED"):
    """A capture response that also carries a saved PayPal wallet."""
    res = completed(ref, amount)
    def with_vault(order_id):
        r = res(order_id)
        r["payment_source"] = {"paypal": {"email_address": "buyer@personal.example.com", "attributes": {
            "vault": {"id": "VAULT-TOKEN-1", "status": vault_status, "customer": {"id": "CUST-1"}}}}}
        return r
    return with_vault


def test_first_payment_can_save_wallet(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"], "save_wallet": True},
                        headers=payer["headers"]).json()
    assert fake_paypal["save_wallet"] is True
    fake_paypal["capture_response"] = vaulted(req["id"])
    client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])
    w = client.get("/api/paypal/wallet", headers=payer["headers"]).json()
    assert w == {"saved": True, "payer_email": "buyer@personal.example.com"}


def test_one_click_payment_still_needs_proof(client, make_user, fake_paypal, monkeypatch):
    from app import paypal as pp
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"], "save_wallet": True},
                        headers=payer["headers"]).json()
    fake_paypal["capture_response"] = vaulted(req["id"])
    client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])

    used = []
    def vaulted_order(ref, amount, currency, desc, vault_id):
        used.append(vault_id)
        r = completed(ref)(f"VORDER-{ref[:6]}")
        r["id"] = f"VORDER-{ref[:6]}"
        return r
    monkeypatch.setattr(pp, "create_vaulted_order", vaulted_order)

    # A new request: the saved wallet alone can't pay it, the proof gate comes first
    merchant = make_user()
    req2 = client.post("/api/payments/requests", json={"amount": "10.00"}, headers=merchant["headers"]).json()
    assert client.post("/api/paypal/orders/vaulted", json={"payment_request_id": req2["id"]},
                       headers=payer["headers"]).status_code == 403
    assert used == []
    res = client.post(f"/api/payments/requests/{req2['id']}/authorize", json=make_proof(payer, req2),
                      headers=payer["headers"]).json()
    assert res["authorized"]
    r = client.post("/api/paypal/orders/vaulted", json={"payment_request_id": req2["id"]}, headers=payer["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["transaction"]["status"] == "COMPLETED"
    assert used == ["VAULT-TOKEN-1"]


def test_one_click_requires_saved_wallet_and_can_be_forgotten(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    assert client.post("/api/paypal/orders/vaulted", json={"payment_request_id": req["id"]},
                       headers=payer["headers"]).status_code == 409
    assert client.delete("/api/paypal/wallet", headers=payer["headers"]).json()["saved"] is False


def test_unvaulted_capture_does_not_save_wallet(client, make_user, fake_paypal):
    _, payer, req = authorized_request(client, make_user)
    order = client.post("/api/paypal/orders", json={"payment_request_id": req["id"], "save_wallet": True},
                        headers=payer["headers"]).json()
    fake_paypal["capture_response"] = vaulted(req["id"], vault_status="APPROVED")
    client.post(f"/api/paypal/orders/{order['order_id']}/capture", headers=payer["headers"])
    assert client.get("/api/paypal/wallet", headers=payer["headers"]).json()["saved"] is False
