from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
import requests
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth import require_admin
from app.models.eibor_rate import EiborMonitoring, EiborRate
from app.models.users import User
from app.services import eibor_service
from app.services.eibor_service import (
    EiborSourceError,
    fetch_eibor_rates,
    parse_eibor_html,
    update_eibor_rates,
)
from database import SessionLocal


client = TestClient(app)

EIBOR_HTML = """
<html><body>
<table class="table">
  <thead><tr>
    <th>Date</th><th>O/N</th><th>أسبوع واحد</th><th>شهر واحد</th>
    <th>ثلاثة أشهر</th><th>ستة أشهر</th><th>سنة واحدة</th><th>Value Date</th>
  </tr></thead>
  <tbody><tr>
    <td>الاثنين 12 أكتوبر 2026</td><td>3.685930</td><td>4.113560</td>
    <td>4.067900</td><td>4.167150</td><td>4.543220</td><td>4.907370</td>
    <td>الأربعاء 14 أكتوبر 2026</td>
  </tr></tbody>
</table>
</body></html>
"""


class FakeResponse:
    status_code = 200
    headers = {"Content-Type": "text/html; charset=utf-8"}
    text = EIBOR_HTML

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


def _clear_rates():
    with SessionLocal() as db:
        db.query(EiborRate).delete()
        db.query(EiborMonitoring).delete()
        db.commit()


def test_parse_maps_official_tenors_and_arabic_publication_date():
    assert parse_eibor_html(
        EIBOR_HTML,
        today=date(2026, 10, 12),
    ) == (
        date(2026, 10, 12),
        Decimal("4.067900"),
        Decimal("4.167150"),
        Decimal("4.543220"),
    )


@pytest.mark.parametrize(
    "html",
    [
        "<html><body>Cloudflare challenge</body></html>",
        EIBOR_HTML.replace("<td>4.543220</td>", "<td>not-a-rate</td>"),
        EIBOR_HTML.replace(
            "<td>4.543220</td><td>4.907370</td>",
            "",
        ),
    ],
)
def test_parser_rejects_challenge_invalid_and_incomplete_data(html):
    with pytest.raises(EiborSourceError):
        parse_eibor_html(html, today=date(2026, 10, 12))


def test_parser_rejects_future_publication_date():
    html = EIBOR_HTML.replace("12 أكتوبر 2026", "13 أكتوبر 2026")
    with pytest.raises(EiborSourceError, match="future"):
        parse_eibor_html(html, today=date(2026, 10, 12))


def test_fetch_retrieves_and_parses_html_with_bounded_timeout():
    requests_seen = []

    result = fetch_eibor_rates(
        get=lambda url, **kwargs: (
            requests_seen.append((url, kwargs)) or FakeResponse()
        ),
        today=date(2026, 10, 12),
    )

    assert result[0] == date(2026, 10, 12)
    assert result[1:] == (
        Decimal("4.067900"),
        Decimal("4.167150"),
        Decimal("4.543220"),
    )
    assert len(requests_seen) == 1
    assert requests_seen[0][1]["timeout"] == (3, 10)


def test_fetch_does_not_retry_cloudflare_access_denial():
    calls = []
    response = FakeResponse()
    response.status_code = 403

    with pytest.raises(EiborSourceError, match="HTTP 403"):
        fetch_eibor_rates(
            get=lambda *args, **kwargs: calls.append(args) or response,
        )

    assert len(calls) == 1


def test_fetch_retries_timeouts_only_a_bounded_number_of_times(monkeypatch):
    calls = []
    monkeypatch.setattr(eibor_service.time, "sleep", lambda _: None)

    def timeout(*args, **kwargs):
        calls.append(args)
        raise requests.Timeout

    with pytest.raises(EiborSourceError, match="3 attempts"):
        fetch_eibor_rates(get=timeout)

    assert len(calls) == eibor_service.MAX_FETCH_ATTEMPTS


def test_update_persists_current_publication_date_and_mapped_values():
    _clear_rates()
    with SessionLocal() as db:
        assert update_eibor_rates(
            db,
            fetcher=lambda: parse_eibor_html(
                EIBOR_HTML,
                today=date(2026, 10, 12),
            ),
            now=datetime(2026, 10, 12, 9, tzinfo=timezone.utc),
        )

    with SessionLocal() as db:
        row = db.get(EiborRate, 1)
        assert row is not None
        assert row.publication_date == date(2026, 10, 12)
        assert row.one_month == Decimal("4.067900")
        assert row.three_month == Decimal("4.167150")
        assert row.six_month == Decimal("4.543220")
        assert row.fetched_at == datetime(2026, 10, 12, 9)
    _clear_rates()


def test_failed_update_preserves_last_known_good_values():
    _clear_rates()
    old_data = (
        date(2026, 10, 9),
        Decimal("4.094960"),
        Decimal("4.191780"),
        Decimal("4.549300"),
    )
    with SessionLocal() as db:
        assert update_eibor_rates(db, fetcher=lambda: old_data)

    def fail_fetch():
        raise EiborSourceError("Source unavailable")

    with SessionLocal() as db:
        with pytest.raises(EiborSourceError):
            update_eibor_rates(db, fetcher=fail_fetch)

    with SessionLocal() as db:
        row = db.get(EiborRate, 1)
        assert row is not None
        assert row.publication_date == old_data[0]
        assert row.one_month == old_data[1]
        assert row.three_month == old_data[2]
        assert row.six_month == old_data[3]
        monitor = db.get(EiborMonitoring, 1)
        assert monitor is not None
        assert monitor.source_status == "invalid_data"
        assert monitor.last_error_code == "invalid_data"
    _clear_rates()


def test_older_publication_cannot_overwrite_newer_rates():
    _clear_rates()
    latest = (
        date(2026, 10, 12),
        Decimal("4.067900"),
        Decimal("4.167150"),
        Decimal("4.543220"),
    )
    with SessionLocal() as db:
        assert update_eibor_rates(db, fetcher=lambda: latest)
    with SessionLocal() as db:
        assert not update_eibor_rates(
            db,
            fetcher=lambda: (
                date(2026, 10, 9),
                Decimal("4.094960"),
                Decimal("4.191780"),
                Decimal("4.549300"),
            ),
        )
    with SessionLocal() as db:
        row = db.get(EiborRate, 1)
        assert row is not None
        assert row.publication_date == latest[0]
        assert row.one_month == latest[1]
    _clear_rates()


def test_unchanged_rates_do_not_update_persisted_publication_metadata():
    _clear_rates()
    initial_publication = (
        date(2026, 10, 9),
        Decimal("4.094960"),
        Decimal("4.191780"),
        Decimal("4.549300"),
    )
    initial_fetch_time = datetime(2026, 10, 9, 9)
    with SessionLocal() as db:
        assert update_eibor_rates(
            db,
            fetcher=lambda: initial_publication,
            now=initial_fetch_time,
        )

    with SessionLocal() as db:
        assert not update_eibor_rates(
            db,
            fetcher=lambda: (
                date(2026, 10, 12),
                *initial_publication[1:],
            ),
            now=datetime(2026, 10, 12, 9),
        )

    with SessionLocal() as db:
        row = db.get(EiborRate, 1)
        monitor = db.get(EiborMonitoring, 1)
        assert row is not None
        assert monitor is not None
        assert row.publication_date == initial_publication[0]
        assert row.fetched_at == initial_fetch_time
        assert row.one_month == initial_publication[1]
        assert row.three_month == initial_publication[2]
        assert row.six_month == initial_publication[3]
        assert monitor.last_successful_publication_date == date(2026, 10, 12)
        assert monitor.last_successful_fetch_at == datetime(2026, 10, 12, 9)
        assert monitor.last_rate_change_at == initial_fetch_time
    _clear_rates()


def test_stale_source_data_is_rejected_and_monitoring_error_is_sanitized():
    _clear_rates()
    now = datetime(2026, 10, 12, 9, tzinfo=timezone.utc)
    stale_result = (
        date(2026, 10, 6),
        Decimal("4.094960"),
        Decimal("4.191780"),
        Decimal("4.549300"),
    )
    with SessionLocal() as db:
        with pytest.raises(EiborSourceError, match="too old"):
            update_eibor_rates(
                db,
                fetcher=lambda: stale_result,
                now=now,
            )

    with SessionLocal() as db:
        assert db.get(EiborRate, 1) is None
        monitor = db.get(EiborMonitoring, 1)
        assert monitor is not None
        assert monitor.source_status == "stale_data"
        assert monitor.last_error_code == "stale_data"
        assert monitor.last_attempt_at == datetime(2026, 10, 12, 9)
        assert monitor.last_successful_fetch_at is None
    _clear_rates()


def test_rate_update_rolls_back_atomically_on_commit_failure(monkeypatch):
    _clear_rates()
    old_data = (
        date(2026, 10, 9),
        Decimal("4.094960"),
        Decimal("4.191780"),
        Decimal("4.549300"),
    )
    with SessionLocal() as db:
        assert update_eibor_rates(db, fetcher=lambda: old_data)
        initial_monitor = db.get(EiborMonitoring, 1)
        assert initial_monitor is not None
        initial_rate_change_at = initial_monitor.last_rate_change_at

    changed_data = (
        date(2026, 10, 12),
        Decimal("4.067900"),
        Decimal("4.167150"),
        Decimal("4.543220"),
    )
    with SessionLocal() as db:
        original_commit = db.commit
        commit_count = 0

        def fail_update_commit():
            nonlocal commit_count
            commit_count += 1
            if commit_count == 2:
                raise RuntimeError("simulated database commit failure")
            original_commit()

        monkeypatch.setattr(db, "commit", fail_update_commit)
        with pytest.raises(RuntimeError, match="commit failure"):
            update_eibor_rates(db, fetcher=lambda: changed_data)

    with SessionLocal() as db:
        row = db.get(EiborRate, 1)
        monitor = db.get(EiborMonitoring, 1)
        assert row is not None
        assert monitor is not None
        assert row.publication_date == old_data[0]
        assert row.one_month == old_data[1]
        assert row.three_month == old_data[2]
        assert row.six_month == old_data[3]
        assert monitor.last_rate_change_at == initial_rate_change_at
        assert monitor.source_status == "source_error"
        assert monitor.last_error_code == "source_error"
    _clear_rates()


def test_persisted_daily_schedule_prevents_duplicate_replica_checks():
    _clear_rates()
    data = (
        date(2026, 10, 12),
        Decimal("4.067900"),
        Decimal("4.167150"),
        Decimal("4.543220"),
    )
    first_check = datetime(2026, 10, 12, 9, tzinfo=timezone.utc)
    with SessionLocal() as db:
        assert update_eibor_rates(
            db,
            fetcher=lambda: data,
            now=first_check,
            only_if_due=True,
        )

    with SessionLocal() as db:
        assert not update_eibor_rates(
            db,
            fetcher=lambda: pytest.fail("Second worker must respect last attempt"),
            now=first_check + timedelta(hours=23),
            only_if_due=True,
        )

    with SessionLocal() as db:
        assert not update_eibor_rates(
            db,
            fetcher=lambda: data,
            now=first_check + timedelta(hours=24),
            only_if_due=True,
        )
        monitor = db.get(EiborMonitoring, 1)
        assert monitor is not None
        assert monitor.last_attempt_at == datetime(2026, 10, 13, 9)
    _clear_rates()


def test_duplicate_update_in_same_process_is_skipped():
    _clear_rates()
    assert eibor_service._UPDATE_LOCK.acquire(blocking=False)
    try:
        with SessionLocal() as db:
            assert not update_eibor_rates(
                db,
                fetcher=lambda: pytest.fail("Fetcher should not run"),
            )
    finally:
        eibor_service._UPDATE_LOCK.release()


def test_eibor_api_reports_unavailable_without_persisted_values():
    _clear_rates()
    response = client.get("/api/eibor")

    assert response.status_code == 200
    assert response.json()["status"] == "unavailable"
    assert response.json()["one_month"] is None
    assert response.json()["three_month"] is None
    assert response.json()["six_month"] is None
    assert response.json()["source_status"] == "not_checked"


def test_eibor_api_returns_stored_values_and_freshness_status():
    _clear_rates()
    publication_date = datetime.now(eibor_service.CBUAE_TIMEZONE).date()
    with SessionLocal() as db:
        update_eibor_rates(
            db,
            fetcher=lambda: (
                publication_date,
                Decimal("4.067900"),
                Decimal("4.167150"),
                Decimal("4.543220"),
            ),
            now=datetime.now(timezone.utc),
        )

    response = client.get("/api/eibor")
    assert response.status_code == 200
    assert response.json()["one_month"] == 4.0679
    assert response.json()["three_month"] == 4.16715
    assert response.json()["six_month"] == 4.54322
    assert response.json()["publication_date"] == publication_date.isoformat()
    assert response.json()["status"] == "fresh"
    assert response.json()["stale"] is False
    _clear_rates()


def test_eibor_api_marks_old_values_stale_after_source_failure():
    _clear_rates()
    today = datetime.now(eibor_service.CBUAE_TIMEZONE).date()
    publication_date = today - timedelta(days=eibor_service.EIBOR_STALE_AFTER_DAYS + 1)
    with SessionLocal() as db:
        db.add(
            EiborRate(
                id=1,
                one_month=Decimal("4.067900"),
                three_month=Decimal("4.167150"),
                six_month=Decimal("4.543220"),
                publication_date=publication_date,
                fetched_at=datetime.now(timezone.utc).replace(tzinfo=None),
                source_url=eibor_service.CBUAE_EIBOR_URL,
            )
        )
        db.add(
            EiborMonitoring(
                id=1,
                last_attempt_at=datetime.now(timezone.utc).replace(tzinfo=None),
                last_successful_fetch_at=datetime.now(timezone.utc).replace(
                    tzinfo=None
                ),
                last_successful_publication_date=publication_date,
                last_rate_change_at=datetime.now(timezone.utc).replace(
                    tzinfo=None
                ),
                source_status="source_forbidden",
                last_error_code="source_forbidden",
            )
        )
        db.commit()

    response = client.get("/api/eibor")

    assert response.status_code == 200
    assert response.json()["status"] == "stale"
    assert response.json()["stale"] is True
    assert response.json()["source_status"] == "unavailable"
    assert response.json()["one_month"] == 4.0679
    assert response.json()["publication_date"] == publication_date.isoformat()
    _clear_rates()


def test_admin_monitoring_endpoint_returns_operational_fields():
    _clear_rates()
    today = datetime.now(eibor_service.CBUAE_TIMEZONE).date()
    with SessionLocal() as db:
        update_eibor_rates(
            db,
            fetcher=lambda: (
                today,
                Decimal("4.067900"),
                Decimal("4.167150"),
                Decimal("4.543220"),
            ),
        )

    app.dependency_overrides[require_admin] = lambda: User(
        id=1,
        email="admin@example.com",
        password_hash="unused",
        full_name="Test Admin",
        is_active=True,
        is_admin=True,
    )
    try:
        response = client.get("/api/admin/eibor/monitoring")
    finally:
        app.dependency_overrides.pop(require_admin)

    assert response.status_code == 200
    data = response.json()
    assert data["monitoring_status"] == "operational"
    assert data["source_status"] == "available"
    assert data["freshness"] == "fresh"
    assert data["last_check_at"] is not None
    assert data["last_successful_fetch_at"] is not None
    assert data["last_rate_change_at"] is not None
    assert data["publication_date"] == today.isoformat()
    assert data["rates"] == {
        "one_month": 4.0679,
        "three_month": 4.16715,
        "six_month": 4.54322,
    }
    assert data["last_error"] is None
    _clear_rates()


def test_worker_checks_automatically_every_24_hours():
    assert eibor_service.EIBOR_UPDATE_INTERVAL_SECONDS == 24 * 60 * 60
    assert eibor_service.is_eibor_check_due(
        datetime(2026, 10, 12, 9),
        datetime(2026, 10, 13, 9, tzinfo=timezone.utc),
    )
    assert not eibor_service.is_eibor_check_due(
        datetime(2026, 10, 12, 9),
        datetime(2026, 10, 13, 8, 59, tzinfo=timezone.utc),
    )
