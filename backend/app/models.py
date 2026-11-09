"""Database models (PRD §12). No private witness data or raw identity documents are stored."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetime on every database.

    SQLite drops the offset, so values came back naive and Python read them as
    local time. That shifted signed credential expiry timestamps off UTC.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            value = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="user")  # user | reviewer
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)


class KycSession(Base):
    __tablename__ = "kyc_sessions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    # started | submitted | needs_review | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="started")
    session_type: Mapped[str] = mapped_column(String(30), default="demo_video_kyc")
    declared: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # what the user typed
    extracted: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # masked OCR fields
    checks: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{name, passed, simulated, detail}]
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript: Mapped[list | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    decision_reason_code: Mapped[str | None] = mapped_column(String(60), nullable=True)


class Credential(Base):
    __tablename__ = "credentials"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    kyc_session_id: Mapped[str] = mapped_column(ForeignKey("kyc_sessions.id"))
    issuer_id: Mapped[str] = mapped_column(String(80))
    credential_type: Mapped[str] = mapped_column(String(40), default="KycApprovedCredential")
    # Field element used inside the circuit (decimal string)
    credential_reference: Mapped[str] = mapped_column(String(100), unique=True)
    holder_commitment: Mapped[str] = mapped_column(String(100))
    kyc_approved: Mapped[int] = mapped_column(Integer, default=1)
    issued_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime())
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | revoked
    signature_reference: Mapped[dict] = mapped_column(JSON)  # {s, r8x, r8y}
    revocation_tag: Mapped[str] = mapped_column(String(100), index=True)
    circuit_version: Mapped[str] = mapped_column(String(40))


class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    recipient_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    payer_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    amount: Mapped[str] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    description: Mapped[str] = mapped_column(String(200), default="")
    challenge: Mapped[str] = mapped_column(String(100))  # field element bound into the proof
    # open | authorized | paid | expired | cancelled
    status: Mapped[str] = mapped_column(String(20), default="open")
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime())
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Proof(Base):
    __tablename__ = "proofs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    credential_id: Mapped[str | None] = mapped_column(ForeignKey("credentials.id"), nullable=True)
    payment_request_id: Mapped[str] = mapped_column(ForeignKey("payment_requests.id"), index=True)
    proof_reference: Mapped[dict] = mapped_column(JSON)  # Groth16 proof (no witness)
    public_inputs: Mapped[list] = mapped_column(JSON)
    nullifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(20))  # accepted | rejected
    rejection_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    verified_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class UsedNullifier(Base):
    """Unique table: a nullifier can authorize exactly one payment."""
    __tablename__ = "used_nullifiers"
    nullifier: Mapped[str] = mapped_column(String(100), primary_key=True)
    payment_request_id: Mapped[str] = mapped_column(ForeignKey("payment_requests.id"))
    used_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    payment_request_id: Mapped[str] = mapped_column(ForeignKey("payment_requests.id"), index=True)
    provider: Mapped[str] = mapped_column(String(20), default="paypal")
    provider_order_id: Mapped[str] = mapped_column(String(64), unique=True)
    provider_capture_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    amount: Mapped[str] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(30))  # CREATED | APPROVED | COMPLETED | FAILED ...
    environment: Mapped[str] = mapped_column(String(10))  # sandbox | live
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    captured_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    actor_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    resource_type: Mapped[str] = mapped_column(String(40))
    resource_id: Mapped[str] = mapped_column(String(64))
    meta: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
