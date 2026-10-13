from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.eibor_rate import EiborMonitoring, EiborRate
from app.models.users import User
from app.services.eibor_service import CBUAE_TIMEZONE, EIBOR_STALE_AFTER_DAYS


router = APIRouter(prefix="/api", tags=["EIBOR"])


def _freshness(
    publication_date: date | None,
    *,
    today: date,
) -> str:
    if publication_date is None:
        return "unavailable"
    if (today - publication_date).days > EIBOR_STALE_AFTER_DAYS:
        return "stale"
    return "fresh"


def _rate_values(rates: EiborRate | None) -> dict[str, float | None]:
    if rates is None:
        return {
            "one_month": None,
            "three_month": None,
            "six_month": None,
        }
    return {
        "one_month": float(rates.one_month),
        "three_month": float(rates.three_month),
        "six_month": float(rates.six_month),
    }


@router.get("/eibor")
def get_eibor_rates(db: Session = Depends(get_db)):
    rates = db.scalar(select(EiborRate).where(EiborRate.id == 1))
    monitor = db.get(EiborMonitoring, 1)
    publication_date = (
        monitor.last_successful_publication_date
        if monitor is not None
        and monitor.last_successful_publication_date is not None
        else rates.publication_date if rates is not None else None
    )
    freshness = _freshness(
        publication_date if rates is not None else None,
        today=datetime.now(CBUAE_TIMEZONE).date(),
    )
    return {
        **_rate_values(rates),
        "status": freshness,
        "publication_date": (
            publication_date.isoformat() if publication_date is not None else None
        ),
        "stored_rates_publication_date": (
            rates.publication_date.isoformat() if rates is not None else None
        ),
        "last_successful_publication_date": (
            monitor.last_successful_publication_date.isoformat()
            if monitor is not None
            and monitor.last_successful_publication_date is not None
            else None
        ),
        "fetched_at": (
            monitor.last_successful_fetch_at.replace(tzinfo=UTC).isoformat()
            if monitor is not None
            and monitor.last_successful_fetch_at is not None
            else rates.fetched_at.replace(tzinfo=UTC).isoformat()
            if rates is not None
            else None
        ),
        "source_status": (
            "available"
            if monitor is not None and monitor.source_status == "available"
            else "unavailable"
            if monitor is not None and monitor.last_attempt_at is not None
            else "not_checked"
        ),
        "last_check_at": (
            monitor.last_attempt_at.replace(tzinfo=UTC).isoformat()
            if monitor is not None and monitor.last_attempt_at is not None
            else None
        ),
        "stale": freshness == "stale",
    }


@router.get("/admin/eibor/monitoring")
def get_eibor_monitoring(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    monitor = db.get(EiborMonitoring, 1)
    rates = db.scalar(select(EiborRate).where(EiborRate.id == 1))
    publication_date = (
        monitor.last_successful_publication_date
        if monitor is not None
        and monitor.last_successful_publication_date is not None
        else rates.publication_date if rates is not None else None
    )
    freshness = _freshness(
        publication_date if rates is not None else None,
        today=datetime.now(CBUAE_TIMEZONE).date(),
    )
    source_status = monitor.source_status if monitor is not None else "not_checked"
    if source_status == "not_checked":
        monitoring_status = "not_started"
    elif source_status == "available":
        monitoring_status = "operational"
    else:
        monitoring_status = "degraded"

    def isoformat(value: datetime | None) -> str | None:
        return value.replace(tzinfo=UTC).isoformat() if value is not None else None

    return {
        "monitoring_status": monitoring_status,
        "last_check_at": isoformat(
            monitor.last_attempt_at if monitor is not None else None
        ),
        "last_successful_fetch_at": isoformat(
            monitor.last_successful_fetch_at if monitor is not None else None
        ),
        "publication_date": (
            rates.publication_date.isoformat() if rates is not None else None
        ),
        "last_successful_publication_date": (
            monitor.last_successful_publication_date.isoformat()
            if monitor is not None
            and monitor.last_successful_publication_date is not None
            else None
        ),
        "last_rate_change_at": isoformat(
            monitor.last_rate_change_at if monitor is not None else None
        ),
        "source_status": source_status,
        "freshness": freshness,
        "last_error": (
            monitor.last_error_code if monitor is not None else None
        ),
        "rates": _rate_values(rates),
    }
