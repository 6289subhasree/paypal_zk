"""Minimal PayPal REST client for Sandbox checkout (Orders API v2). Secrets stay server-side."""
import time

import httpx

from .config import get_settings

settings = get_settings()
_token: dict = {"value": None, "expires": 0.0}


class PayPalError(RuntimeError):
    def __init__(self, message: str, status: int | None = None, debug_id: str | None = None, issue: str | None = None):
        super().__init__(message)
        self.status, self.debug_id, self.issue = status, debug_id, issue


def _client() -> httpx.Client:
    return httpx.Client(base_url=settings.paypal_base_url, timeout=20.0)


def access_token() -> str:
    if _token["value"] and _token["expires"] - 60 > time.time():
        return _token["value"]
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise PayPalError("PayPal Sandbox credentials are not configured")
    with _client() as c:
        r = c.post("/v1/oauth2/token", data={"grant_type": "client_credentials"},
                   auth=(settings.paypal_client_id, settings.paypal_client_secret))
    if r.status_code != 200:
        raise PayPalError("PayPal authentication failed", r.status_code)
    body = r.json()
    _token.update(value=body["access_token"], expires=time.time() + int(body.get("expires_in", 300)))
    return _token["value"]


def _request(method: str, path: str, idempotency_key: str | None = None, json: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {access_token()}", "Content-Type": "application/json"}
    if idempotency_key:
        headers["PayPal-Request-Id"] = idempotency_key  # makes create/capture safe to retry
    with _client() as c:
        r = c.request(method, path, headers=headers, json=json)
    if r.status_code >= 400:
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        details = body.get("details") or [{}]
        issue = details[0].get("issue")
        message = body.get("message") or f"PayPal returned {r.status_code}"
        if issue:
            message = f"{message} ({issue}: {details[0].get('description', '').strip()})"
        raise PayPalError(message, r.status_code, body.get("debug_id"), issue)
    return r.json()


def create_order(reference_id: str, amount: str, currency: str, description: str) -> dict:
    return _request("POST", "/v2/checkout/orders", idempotency_key=f"create-{reference_id}", json={
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference_id,
            "description": (description or "ZK Pass payment")[:127],
            "amount": {"currency_code": currency, "value": amount},
        }],
    })


def capture_order(order_id: str) -> dict:
    return _request("POST", f"/v2/checkout/orders/{order_id}/capture", idempotency_key=f"capture-{order_id}")


def get_order(order_id: str) -> dict:
    return _request("GET", f"/v2/checkout/orders/{order_id}")
