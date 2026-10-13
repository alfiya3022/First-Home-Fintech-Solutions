from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class ContactRateLimit(Base):
    __tablename__ = "contact_rate_limits"
    __table_args__ = (
        Index(
            "ix_contact_rate_limits_window_started_at",
            "window_started_at",
        ),
    )

    ip_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_started_at: Mapped[datetime] = mapped_column(
        DateTime(),
        nullable=False,
    )
    request_count: Mapped[int] = mapped_column(
        Integer(),
        nullable=False,
    )
