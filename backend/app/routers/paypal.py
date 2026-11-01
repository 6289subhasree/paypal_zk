"""PayPal Sandbox checkout, available only after the ZK payment gate (FR-10)."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import paypal
from ..audit import audit
from ..config import get_settings
from ..db import get_db
from ..models import PaymentRequest, Transaction, User, utcnow
from ..security import current_user

router = APIRouter(prefix="/api/paypal", tags=["paypal"])
settings = get_settings()


class CreateOrderIn(BaseModel):
    payment_request_id: str


def tx_out(tx: Transaction) -> dict:
    return {
        "id": tx.id, "payment_request_id": tx.payment_request_id,
        "provider": tx.provider, "provider_order_id": tx.provider_order_id,
        "provider_capture_id": tx.provider_capture_id,
        "amount": f"{Decimal(tx.amount):.2f}", "currency": tx.currency,
        "status": tx.status, "environment": tx.environment,
        "created_at": tx.created_at.isoformat(),
        "captured_at": tx.captured_at.isoformat() if tx.captured_at else None,
    }


def _paypal_call(fn, *args):
    try:
        return fn(*args)
    except paypal.PayPalError as e:
        raise HTTPException(502, {"message": str(e), "debug_id": e.debug_id})


@router.get("/config")
def client_config():
    # The client ID is public by design; the secret never leaves the backend.
    return {"client_id": settings.paypal_client_id, "environment": settings.paypal_mode}


@router.post("/orders")
def create_order(body: CreateOrderIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pr = db.get(PaymentRequest, body.payment_request_id)
    if pr is None:
        raise HTTPException(404, "Payment request not found")
    # The ZK gate: only a request authorized by a valid proof, and only for that payer.
    if pr.status != "authorized" or pr.payer_user_id != user.id:
        raise HTTPException(403, "Checkout is locked until a valid proof authorizes this payment")

    existing = db.query(Transaction).filter_by(payment_request_id=pr.id, status="CREATED").first()
    if existing:
        return {"order_id": existing.provider_order_id, "transaction": tx_out(existing)}

    amount = f"{Decimal(pr.amount):.2f}"
    order = _paypal_call(paypal.create_order, pr.id, amount, pr.currency, pr.description)
    tx = Transaction(payment_request_id=pr.id, provider_order_id=order["id"], amount=pr.amount,
                     currency=pr.currency, status=order.get("status", "CREATED"), environment=settings.paypal_mode)
    db.add(tx)
    db.flush()
    audit(db, user.id, "paypal.order_created", "transaction", tx.id, provider_order_id=order["id"])
    db.commit()
    return {"order_id": order["id"], "transaction": tx_out(tx)}


@router.post("/orders/{order_id}/capture")
def capture(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter_by(provider_order_id=order_id).first()
    if tx is None:
        raise HTTPException(404, "Order not found")
    pr = db.get(PaymentRequest, tx.payment_request_id)
    if pr.payer_user_id != user.id:
        raise HTTPException(403, "Not your order")
    if tx.status == "COMPLETED":
        return {"transaction": tx_out(tx)}  # duplicate capture: return the stored result

    result = _paypal_call(paypal.capture_order, order_id)

    # Validate the provider response server-side; never trust the frontend callback.
    try:
        unit = result["purchase_units"][0]
        cap = unit["payments"]["captures"][0]
        ok = (
            result.get("status") == "COMPLETED"
            and cap.get("status") == "COMPLETED"
            and unit.get("reference_id") == pr.id
            and cap["amount"]["value"] == f"{Decimal(pr.amount):.2f}"
            and cap["amount"]["currency_code"] == pr.currency
        )
    except (KeyError, IndexError, TypeError):
        ok, cap = False, {}

    if not ok:
        tx.status = result.get("status") or "FAILED"
        audit(db, user.id, "paypal.capture_unverified", "transaction", tx.id, provider_status=tx.status)
        db.commit()
        raise HTTPException(502, {"message": "PayPal did not confirm a completed capture for this payment",
                                  "provider_status": tx.status})

    tx.status, tx.provider_capture_id, tx.captured_at = "COMPLETED", cap["id"], utcnow()
    pr.status = "paid"
    audit(db, user.id, "paypal.captured", "transaction", tx.id, provider_capture_id=cap["id"])
    db.commit()
    return {"transaction": tx_out(tx)}


@router.get("/orders/{order_id}")
def order_status(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter_by(provider_order_id=order_id).first()
    if tx is None:
        raise HTTPException(404, "Order not found")
    pr = db.get(PaymentRequest, tx.payment_request_id)
    if user.id not in (pr.payer_user_id, pr.recipient_user_id):
        raise HTTPException(403, "Not your order")
    return {"transaction": tx_out(tx), "provider": _paypal_call(paypal.get_order, order_id)}
