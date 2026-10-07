import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.sessions import Session as UserSession


SESSION_DURATION_HOURS = 1


def create_session(db: Session, user_id: int) -> UserSession:
    session = UserSession(
        id=secrets.token_urlsafe(48),
        user_id=user_id,
        expires_at=datetime.utcnow()
        + timedelta(hours=SESSION_DURATION_HOURS),
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session