from sqlalchemy.orm import Session

from .models import AuditLog

# Keys that must never reach the audit log.
_FORBIDDEN = {"password", "holder_secret", "secret", "token", "access_token", "document", "witness"}


def audit(db: Session, actor_id: str | None, action: str, resource_type: str, resource_id: str, **meta) -> None:
    clean = {k: v for k, v in meta.items() if k.lower() not in _FORBIDDEN}
    db.add(AuditLog(actor_id=actor_id, action=action, resource_type=resource_type,
                    resource_id=resource_id, meta=clean or None))
