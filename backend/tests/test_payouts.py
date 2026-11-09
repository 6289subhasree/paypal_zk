"""Proof-gated PayPal Payouts, with the provider mocked."""
import pytest

from app import paypal
from tests.helpers import holder_with_credential, make_proof


@pytest.fixture
def fake_payouts(monkeypatch):
    sent = []

    def create_payout(pid, email, amount, currency, note):
        sent.append((pid, email, amount, currency))
        return {"batch_header": {"payout_batch_id": f"BATCH-{pid[:6]}", "batch_status": "PENDING"}}

    monkeypatch.setattr(paypal, "create_payout", create_payout)
    monkeypatch.setattr(paypal, "get_payout", lambda b: {"items": [{"transaction_status": "SUCCESS"}]})
    return sent


def new_payout(client, make_user, **extra):
    sender = make_user()
    r = client.post("/api/payouts", json={"amount": "25.00", "note": "Logo design", **extra}, headers=sender["headers"])
    assert r.status_code == 200, r.text
    return sender, r.json()


def claim(client, who, payout, body, email="freelancer@personal.example.com"):
    return client.post(f"/api/payouts/{payout['id']}/claim", json={**body, "paypal_email": email}, headers=who["headers"])


def test_valid_proof_releases_payout(client, make_user, fake_payouts):
    sender, payout = new_payout(client, make_user)
    freelancer = holder_with_credential(client, make_user)
    r = claim(client, freelancer, payout, make_proof(freelancer, payout)).json()
    assert r["released"] is True
    assert r["payout"]["status"] == "sent" and r["payout"]["provider_batch_id"].startswith("BATCH-")
    assert fake_payouts == [(payout["id"], "freelancer@personal.example.com", "25.00", "USD")]
    refreshed = client.post(f"/api/payouts/{payout['id']}/refresh", headers=sender["headers"]).json()
    assert refreshed["provider_item_status"] == "SUCCESS"


def test_no_payout_without_valid_proof(client, make_user, fake_payouts):
    _, payout = new_payout(client, make_user)
    freelancer = holder_with_credential(client, make_user)
    body = make_proof(freelancer, payout)
    body["proof"]["pi_a"][0] = str(int(body["proof"]["pi_a"][0]) + 1)
    assert claim(client, freelancer, payout, body).json()["code"] == "invalid_proof"
    assert fake_payouts == []


def test_proof_for_other_payout_rejected(client, make_user, fake_payouts):
    _, a = new_payout(client, make_user)
    _, b = new_payout(client, make_user)
    freelancer = holder_with_credential(client, make_user)
    assert claim(client, freelancer, b, make_proof(freelancer, a)).json()["code"] == "wrong_payment"
    assert fake_payouts == []


def test_payout_claimed_only_once(client, make_user, fake_payouts):
    _, payout = new_payout(client, make_user)
    freelancer = holder_with_credential(client, make_user)
    body = make_proof(freelancer, payout)
    assert claim(client, freelancer, payout, body).json()["released"] is True
    assert claim(client, freelancer, payout, body).json()["code"] == "replayed"
    other = holder_with_credential(client, make_user, secret="111222333")
    assert claim(client, other, payout, make_proof(other, payout)).status_code == 409
    assert len(fake_payouts) == 1


def test_sender_cannot_claim_own_payout(client, make_user, fake_payouts):
    sender = holder_with_credential(client, make_user)
    payout = client.post("/api/payouts", json={"amount": "5.00"}, headers=sender["headers"]).json()
    assert claim(client, sender, payout, make_proof(sender, payout)).status_code == 400


def test_paypal_refusal_reopens_payout(client, make_user, monkeypatch):
    def refuse(*a):
        raise paypal.PayPalError("Authorization error occurred", 403, "dbg", "AUTHORIZATION_ERROR")
    monkeypatch.setattr(paypal, "create_payout", refuse)
    _, payout = new_payout(client, make_user)
    freelancer = holder_with_credential(client, make_user)
    r = claim(client, freelancer, payout, make_proof(freelancer, payout))
    assert r.status_code == 502 and "United States Sandbox business account" in r.json()["detail"]["message"]
    assert client.get(f"/api/payouts/{payout['id']}", headers=freelancer["headers"]).json()["status"] == "awaiting_proof"


def test_age_restricted_payout(client, make_user, fake_payouts):
    _, payout = new_payout(client, make_user, min_age=18)
    adult = holder_with_credential(client, make_user)
    assert claim(client, adult, payout, make_proof(adult, payout)).json()["released"] is True
