"""PayPal Sandbox flow with the provider mocked (no network in CI)."""
import pytest

from app import paypal
from tests.helpers import holder_with_credential, make_proof


@pytest.fixture
def fake_paypal(monkeypatch):
    calls = {"create": 0, "capture": 0}

    def create_order(ref, amount, currency, desc):
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

    monkeypatch.setattr(pp, "create_order", lambda ref, a, c, d: {"id": f"ORDER-ERR-{ref[:6]}", "status": "CREATED"})

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
