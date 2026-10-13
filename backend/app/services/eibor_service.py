import logging
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
import os
import re
from threading import Lock
import time
from typing import Protocol
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.eibor_rate import EiborMonitoring, EiborRate


logger = logging.getLogger(__name__)

CBUAE_EIBOR_URL = "https://centralbank.ae/umbraco/Surface/Eibor/GetEiborData"
CBUAE_TIMEZONE = ZoneInfo("Asia/Dubai")
EIBOR_UPDATE_INTERVAL_SECONDS = 24 * 60 * 60
EIBOR_STALE_AFTER_DAYS = 5
HTTP_TIMEOUT = (3, 10)
MAX_FETCH_ATTEMPTS = 3
_UPDATE_LOCK_ID = 1_741_120_262
_UPDATE_LOCK = Lock()

_ARABIC_MONTHS = {
    "يناير": 1,
    "فبراير": 2,
    "مارس": 3,
    "أبريل": 4,
    "ابريل": 4,
    "مايو": 5,
    "يونيو": 6,
    "يوليو": 7,
    "أغسطس": 8,
    "اغسطس": 8,
    "سبتمبر": 9,
    "أكتوبر": 10,
    "اكتوبر": 10,
    "نوفمبر": 11,
    "ديسمبر": 12,
}


class EiborSourceError(RuntimeError):
    def __init__(self, message: str, code: str = "invalid_data") -> None:
        super().__init__(message)
        self.code = code


class EiborSource(Protocol):
    def fetch(
        self,
        *,
        today: date | None = None,
    ) -> tuple[date, Decimal, Decimal, Decimal]: ...


class CbuaeHtmlSource:
    def __init__(self, get: Callable = requests.get) -> None:
        self._get = get

    def fetch(
        self,
        *,
        today: date | None = None,
    ) -> tuple[date, Decimal, Decimal, Decimal]:
        source_url = _source_url()
        last_error: Exception | None = None
        for attempt in range(1, MAX_FETCH_ATTEMPTS + 1):
            try:
                response = self._get(
                    source_url,
                    headers={"Accept": "text/html"},
                    timeout=HTTP_TIMEOUT,
                    allow_redirects=False,
                )
                if response.status_code != 200:
                    if response.status_code == 403:
                        logger.warning(
                            "CBUAE denied EIBOR server access with HTTP 403."
                        )
                        raise EiborSourceError(
                            "CBUAE denied server access to the EIBOR source "
                            "(HTTP 403).",
                            code="source_forbidden",
                        )
                    if response.status_code == 429:
                        raise EiborSourceError(
                            "CBUAE EIBOR source rate limited the request.",
                            code="source_rate_limited",
                        )
                    if response.status_code >= 500:
                        response.raise_for_status()
                    raise EiborSourceError(
                        f"CBUAE EIBOR request failed with HTTP "
                        f"{response.status_code}.",
                        code="source_http_error",
                    )
                if "text/html" not in response.headers.get(
                    "Content-Type", ""
                ).lower():
                    raise EiborSourceError(
                        "CBUAE EIBOR response was not HTML.",
                        code="invalid_response",
                    )
                return parse_eibor_html(response.text, today=today)
            except EiborSourceError:
                raise
            except (requests.RequestException, OSError) as error:
                last_error = error
                if attempt == MAX_FETCH_ATTEMPTS:
                    break
                time.sleep(attempt)

        if isinstance(last_error, requests.Timeout):
            raise EiborSourceError(
                f"Unable to retrieve EIBOR data after "
                f"{MAX_FETCH_ATTEMPTS} attempts.",
                code="source_timeout",
            ) from last_error
        if isinstance(last_error, requests.HTTPError):
            raise EiborSourceError(
                "CBUAE EIBOR source returned a server error.",
                code="source_server_error",
            ) from last_error
        raise EiborSourceError(
            f"Unable to retrieve EIBOR data after {MAX_FETCH_ATTEMPTS} attempts.",
            code="source_unavailable",
        ) from last_error


def is_eibor_check_due(
    last_attempt_at: datetime | None,
    current_time: datetime,
) -> bool:
    if last_attempt_at is None:
        return True
    if last_attempt_at.tzinfo is None:
        last_attempt_at = last_attempt_at.replace(tzinfo=UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)
    return (
        current_time.astimezone(UTC) - last_attempt_at.astimezone(UTC)
        >= timedelta(seconds=EIBOR_UPDATE_INTERVAL_SECONDS)
    )


class _EiborTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[tuple[str, str]]]] = []
        self._table: list[list[tuple[str, str]]] | None = None
        self._row: list[tuple[str, str]] | None = None
        self._cell_tag: str | None = None
        self._cell_text: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag == "table":
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in {"th", "td"} and self._row is not None:
            self._cell_tag = tag
            self._cell_text = []
        elif tag == "br" and self._cell_tag is not None:
            self._cell_text.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell_tag is not None:
            self._cell_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"th", "td"} and self._cell_tag == tag and self._row is not None:
            self._row.append((tag, " ".join("".join(self._cell_text).split())))
            self._cell_tag = None
            self._cell_text = []
        elif tag == "tr" and self._row is not None and self._table is not None:
            if self._row:
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None


def _parse_publication_date(value: str) -> date:
    match = re.search(r"(\d{1,2})\s+([^\s]+)\s+(\d{4})", value)
    if match is None:
        raise EiborSourceError("EIBOR publication date is invalid.")

    day_text, month_text, year_text = match.groups()
    month = _ARABIC_MONTHS.get(month_text)
    if month is None:
        try:
            month = datetime.strptime(month_text, "%b").month
        except ValueError as error:
            try:
                month = datetime.strptime(month_text, "%B").month
            except ValueError:
                raise EiborSourceError(
                    "EIBOR publication date is invalid."
                ) from error

    try:
        return date(int(year_text), month, int(day_text))
    except ValueError as error:
        raise EiborSourceError("EIBOR publication date is invalid.") from error


def _parse_rate(value: str) -> Decimal:
    try:
        rate = Decimal(value.strip().replace(",", "."))
    except InvalidOperation as error:
        raise EiborSourceError("EIBOR rate value is invalid.") from error
    if not rate.is_finite() or rate <= 0 or rate > 100:
        raise EiborSourceError("EIBOR rate value is outside valid bounds.")
    return rate.quantize(Decimal("0.000001"))


def parse_eibor_html(
    content: str,
    *,
    today: date | None = None,
) -> tuple[date, Decimal, Decimal, Decimal]:
    parser = _EiborTableParser()
    parser.feed(content)
    reference_date = today or datetime.now(CBUAE_TIMEZONE).date()

    for rows in parser.tables:
        if not rows:
            continue
        header = [value for tag, value in rows[0] if tag == "th"]
        normalized = {label.strip().casefold(): index for index, label in enumerate(header)}
        date_index = normalized.get("date")
        one_month_index = normalized.get("شهر واحد")
        three_month_index = normalized.get("ثلاثة أشهر")
        six_month_index = normalized.get("ستة أشهر")
        if None in (
            date_index,
            one_month_index,
            three_month_index,
            six_month_index,
        ):
            continue

        for row in rows[1:]:
            cells = [value for tag, value in row if tag == "td"]
            required_index = max(
                date_index,
                one_month_index,
                three_month_index,
                six_month_index,
            )
            if len(cells) <= required_index:
                continue

            publication_date = _parse_publication_date(cells[date_index])
            rates = (
                _parse_rate(cells[one_month_index]),
                _parse_rate(cells[three_month_index]),
                _parse_rate(cells[six_month_index]),
            )
            if publication_date > reference_date:
                raise EiborSourceError("EIBOR publication date is in the future.")
            return (publication_date, *rates)

    raise EiborSourceError("No current EIBOR rates table was found.")


def _source_url() -> str:
    source_url = os.getenv("EIBOR_SOURCE_URL", CBUAE_EIBOR_URL).strip()
    parsed = urlparse(source_url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in {"centralbank.ae", "www.centralbank.ae"}
        or parsed.username
        or parsed.password
    ):
        raise EiborSourceError("EIBOR source URL must be an official CBUAE HTTPS URL.")
    return source_url


def fetch_eibor_rates(
    *,
    get: Callable = requests.get,
    today: date | None = None,
) -> tuple[date, Decimal, Decimal, Decimal]:
    return CbuaeHtmlSource(get=get).fetch(today=today)


def _utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(UTC).replace(tzinfo=None)


def _ensure_monitoring_row(db: Session) -> EiborMonitoring:
    monitor = db.get(EiborMonitoring, 1)
    if monitor is None:
        monitor = EiborMonitoring(id=1, source_status="not_checked")
        db.add(monitor)
        db.flush()
    return monitor


def _record_check_failure(db: Session, error: Exception) -> None:
    db.rollback()
    monitor = _ensure_monitoring_row(db)
    if isinstance(error, EiborSourceError):
        monitor.source_status = error.code
        monitor.last_error_code = error.code
    else:
        monitor.source_status = "source_error"
        monitor.last_error_code = "source_error"
    db.commit()


def _validate_source_data(
    result: tuple[date, Decimal, Decimal, Decimal],
    *,
    current_date: date,
) -> tuple[date, Decimal, Decimal, Decimal]:
    if not isinstance(result, tuple) or len(result) != 4:
        raise EiborSourceError("CBUAE EIBOR data was incomplete.")
    publication_date, *rates = result
    if not isinstance(publication_date, date) or isinstance(
        publication_date, datetime
    ):
        raise EiborSourceError("EIBOR publication date is invalid.")
    if publication_date > current_date:
        raise EiborSourceError("EIBOR publication date is in the future.")
    if current_date - publication_date > timedelta(days=EIBOR_STALE_AFTER_DAYS):
        raise EiborSourceError(
            "EIBOR publication date is too old.",
            code="stale_data",
        )

    normalized_rates: list[Decimal] = []
    for rate in rates:
        try:
            parsed_rate = Decimal(rate)
        except (InvalidOperation, TypeError, ValueError) as error:
            raise EiborSourceError("EIBOR rate value is invalid.") from error
        if not parsed_rate.is_finite() or parsed_rate <= 0 or parsed_rate > 100:
            raise EiborSourceError("EIBOR rate value is outside valid bounds.")
        normalized_rates.append(parsed_rate.quantize(Decimal("0.000001")))
    return publication_date, *normalized_rates


def update_eibor_rates(
    db: Session,
    *,
    fetcher: Callable | None = None,
    source: EiborSource | None = None,
    now: datetime | None = None,
    only_if_due: bool = False,
) -> bool:
    if not _UPDATE_LOCK.acquire(blocking=False):
        logger.info("EIBOR monitoring check completed. status=skipped_locked")
        return False

    lock_connection = None
    advisory_lock_acquired = False
    try:
        if db.bind is not None and db.bind.dialect.name == "postgresql":
            lock_connection = db.bind.connect()
            advisory_lock_acquired = bool(
                lock_connection.scalar(
                    text("SELECT pg_try_advisory_lock(:lock_id)"),
                    {"lock_id": _UPDATE_LOCK_ID},
                )
            )
            lock_connection.commit()
            if not advisory_lock_acquired:
                logger.info(
                    "EIBOR monitoring check completed. status=skipped_locked"
                )
                return False

        current_time = now or datetime.now(UTC)
        current_date = (
            current_time.astimezone(CBUAE_TIMEZONE).date()
            if current_time.tzinfo is not None
            else current_time.date()
        )
        current_time_utc = _utc_naive(current_time)

        monitor = db.get(EiborMonitoring, 1)
        if only_if_due and not is_eibor_check_due(
            monitor.last_attempt_at if monitor is not None else None,
            current_time,
        ):
            return False

        monitor = _ensure_monitoring_row(db)
        monitor.last_attempt_at = current_time_utc
        monitor.source_status = "checking"
        monitor.last_error_code = None
        db.commit()

        try:
            result = _validate_source_data(
                fetcher() if fetcher is not None else (
                    source or CbuaeHtmlSource()
                ).fetch(),
                current_date=current_date,
            )
            publication_date, one_month, three_month, six_month = result
            successful_fetch_at = _utc_naive(now or datetime.now(UTC))
            record = db.scalar(
                select(EiborRate)
                .where(EiborRate.id == 1)
                .with_for_update()
            )
            monitor = _ensure_monitoring_row(db)
            monitor.last_successful_fetch_at = successful_fetch_at
            monitor.last_successful_publication_date = publication_date
            monitor.source_status = "available"
            monitor.last_error_code = None

            if record is not None and publication_date < record.publication_date:
                monitor.source_status = "invalid_data"
                monitor.last_error_code = "older_publication"
                db.commit()
                logger.warning(
                    "EIBOR monitoring check completed. "
                    "status=older_publication_ignored "
                    "incoming_date=%s stored_date=%s",
                    publication_date.isoformat(),
                    record.publication_date.isoformat(),
                )
                return False

            rates_changed = record is None or (
                record.one_month,
                record.three_month,
                record.six_month,
            ) != (one_month, three_month, six_month)
            if not rates_changed:
                db.commit()
                logger.info(
                    "EIBOR monitoring check completed. "
                    "status=unchanged publication_date=%s",
                    publication_date.isoformat(),
                )
                return False

            if record is None:
                record = EiborRate(
                    id=1,
                    one_month=one_month,
                    three_month=three_month,
                    six_month=six_month,
                    publication_date=publication_date,
                    fetched_at=successful_fetch_at,
                    source_url=_source_url(),
                )
                db.add(record)
            else:
                record.one_month = one_month
                record.three_month = three_month
                record.six_month = six_month
                record.publication_date = publication_date
                record.fetched_at = successful_fetch_at
                record.source_url = _source_url()
            monitor.last_rate_change_at = successful_fetch_at
            db.commit()
            logger.info(
                "EIBOR monitoring check completed. "
                "status=rates_updated publication_date=%s",
                publication_date.isoformat(),
            )
            return True
        except Exception as error:
            _record_check_failure(db, error)
            logger.error(
                "EIBOR monitoring check completed. status=failed "
                "error_code=%s stored_rates_preserved=true",
                error.code if isinstance(error, EiborSourceError) else "source_error",
            )
            raise
    finally:
        if lock_connection is not None:
            if advisory_lock_acquired:
                lock_connection.scalar(
                    text("SELECT pg_advisory_unlock(:lock_id)"),
                    {"lock_id": _UPDATE_LOCK_ID},
                )
                lock_connection.commit()
            lock_connection.close()
        _UPDATE_LOCK.release()
