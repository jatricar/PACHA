from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.domain import UsageEventEntity


def log_usage_event(db: Session, user_id: str, event_type: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Best-effort usage logging for the admin analytics dashboard. Never lets
    a logging failure break the actual user-facing request."""
    try:
        event = UsageEventEntity(user_id=user_id, event_type=event_type, event_metadata=metadata or {})
        db.add(event)
        db.commit()
    except Exception:
        db.rollback()
