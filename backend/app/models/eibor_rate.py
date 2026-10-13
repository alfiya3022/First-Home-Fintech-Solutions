from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class EiborRate(Base):
    __tablename__ = "eibor_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    one_month: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    three_month: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    six_month: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    publication_date: Mapped[date] = mapped_column(Date, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)


class EiborMonitoring(Base):
    __tablename__ = "eibor_monitoring"
    __table_args__ = (
        CheckConstraint("id = 1", name="ck_eibor_monitoring_singleton"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_successful_fetch_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_successful_publication_date: Mapped[date | None] = mapped_column(Date)
    last_rate_change_at: Mapped[datetime | None] = mapped_column(DateTime)
    source_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="not_checked",
    )
    last_error_code: Mapped[str | None] = mapped_column(String(50))
