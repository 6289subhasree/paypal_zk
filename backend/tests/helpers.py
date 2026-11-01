from app.db import SessionLocal
from app.models import KycSession, utcnow


def approve_kyc(user_id: str) -> str:
    """Test shortcut: mark a KYC session approved without the full KYC flow."""
    with SessionLocal() as db:
        s = KycSession(user_id=user_id, status="approved", completed_at=utcnow(), reviewed_at=utcnow())
        db.add(s)
        db.commit()
        return s.id
