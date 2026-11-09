"""PayPal Sandbox checkout, available only after the ZK payment gate (FR-10)."""
import logging
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
from .payments import transaction_out

router = APIRouter(prefix="/api/paypal", tags=["paypal"])
log = logging.getLogger("zkpass.paypal")
settings = get_settings()


class CreateOrderIn(BaseModel):
    payment_request_id: str


# Plain-language hints for the PayPal errors people actually hit in Sandbox.
HINTS = {
    "ORDER_NOT_APPROVED": "The buyer hasn't approved this order in the PayPal window yet.",
    "PAYER_CANNOT_PAY": "This Sandbox buyer can't pay this merchant. If both Sandbox accounts are in India, "
                        "create a United States personal Sandbox account and pay with that.",
    "PAYEE_ACCOUNT_RESTRICTED": "The Sandbox merchant account is restricted. Create a new Sandbox business account.",
    "INSTRUMENT_DECLINED": "The Sandbox buyer's card was declined. Try again or pick another funding source.",
    "INSUFFICIENT_FUNDS": "The Sandbox business account doesn't have enough balance for this payout.",
    "AUTHORIZATION_ERROR": "This Sandbox app isn't allowed to send Payouts. In the PayPal Developer dashboard, "
                           "create a United States Sandbox business account and an app linked to it.",
    "NOT_AUTHORIZED": "This Sandbox app isn't allowed to use this PayPal feature. Use an app linked to a "
                      "United States Sandbox business account.",
    "RECEIVER_UNREGISTERED": "That email isn't a PayPal Sandbox account. Use a Sandbox personal account's email.",
}


def _paypal_call(fn, *args, db: Session | None = None, user: User | None = None, tx: Transaction | None = None,
                 action: str = "call"):
    try:
        return fn(*args)
    except paypal.PayPalError as e:
        log.warning("PayPal %s failed: %s (debug_id=%s)", action, e, e.debug_id)
        if db is not None and tx is not None:
            audit(db, user.id if user else None, f"paypal.{action}_failed", "transaction", tx.id,
                  issue=e.issue, debug_id=e.debug_id)
            db.commit()
        hint = HINTS.get(e.issue or "", "")
        raise HTTPException(502, {"message": f"{e} {hint}".strip(), "issue": e.issue, "debug_id": e.debug_id})


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
        return {"order_id": existing.provider_order_id, "transaction": transaction_out(existing)}

    amount = f"{Decimal(pr.amount):.2f}"
    order = _paypal_call(paypal.create_order, pr.id, amount, pr.currency, pr.description)
    tx = Transaction(payment_request_id=pr.id, provider_order_id=order["id"], amount=pr.amount,
                     currency=pr.currency, status=order.get("status", "CREATED"), environment=settings.paypal_mode)
    db.add(tx)
    db.flush()
    audit(db, user.id, "paypal.order_created", "transaction", tx.id, provider_order_id=order["id"])
    db.commit()
    return {"order_id": order["id"], "transaction": transaction_out(tx)}


@router.post("/orders/{order_id}/capture")
def capture(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter_by(provider_order_id=order_id).first()
    if tx is None:
        raise HTTPException(404, "Order not found")
    pr = db.get(PaymentRequest, tx.payment_request_id)
    if pr.payer_user_id != user.id:
        raise HTTPException(403, "Not your order")
    if tx.status == "COMPLETED":
        return {"transaction": transaction_out(tx)}  # duplicate capture: return the stored result

    result = _paypal_call(paypal.capture_order, order_id, db=db, user=user, tx=tx, action="capture")

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
    return {"transaction": transaction_out(tx)}


@router.get("/orders/{order_id}")
def order_status(order_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter_by(provider_order_id=order_id).first()
    if tx is None:
        raise HTTPException(404, "Order not found")
    pr = db.get(PaymentRequest, tx.payment_request_id)
    if user.id not in (pr.payer_user_id, pr.recipient_user_id):
        raise HTTPException(403, "Not your order")
    return {"transaction": transaction_out(tx), "provider": _paypal_call(paypal.get_order, order_id)}


@router.post("/transactions/{transaction_id}/refund")
def refund(transaction_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Full refund of a captured Sandbox payment. Only the merchant who was paid can refund."""
    tx = db.get(Transaction, transaction_id)
    if tx is None:
        raise HTTPException(404, "Transaction not found")
    pr = db.get(PaymentRequest, tx.payment_request_id)
    if pr.recipient_user_id != user.id:
        raise HTTPException(403, "Only the merchant who received this payment can refund it")
    if tx.refund_id:
        return {"transaction": transaction_out(tx)}  # already refunded: idempotent
    if tx.status != "COMPLETED" or not tx.provider_capture_id:
        raise HTTPException(409, "Only a completed, captured payment can be refunded")

    result = _paypal_call(paypal.refund_capture, tx.provider_capture_id, f"Refund for {pr.description}"[:255],
                          db=db, user=user, tx=tx, action="refund")
    if result.get("status") not in ("COMPLETED", "PENDING") or not result.get("id"):
        raise HTTPException(502, {"message": "PayPal did not confirm the refund", "provider_status": result.get("status")})

    tx.refund_id, tx.refund_status, tx.refunded_at = result["id"], result["status"], utcnow()
    pr.status = "refunded"
    audit(db, user.id, "paypal.refunded", "transaction", tx.id, refund_id=result["id"], refund_status=result["status"])
    db.commit()
    return {"transaction": transaction_out(tx)}
