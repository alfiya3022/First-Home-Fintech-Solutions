import logging
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.lead_notification_outbox import (
    LeadNotificationOutbox,
    utc_now_naive,
)
from app.models.leads import Lead, LeadStatus
from app.services.notification_outbox import (
    MAX_ATTEMPTS,
    process_next_notification,
    retry_delay_seconds,
)
from database import SessionLocal


def _create_queued_lead() -> tuple[int, int]:
    suffix = uuid4().hex
    with SessionLocal() as db:
        lead = Lead(
            name=f"Synthetic {suffix}",
            email=f"{suffix}@example.test",
            phone="0501234567",
            service="Home Financing",
            message="Synthetic outbox test lead.",
            status=LeadStatus.NEW,
        )
        db.add(lead)
        db.flush()

        notification = LeadNotificationOutbox(lead_id=lead.id)
        db.add(notification)
        db.commit()
        return lead.id, notification.id


def test_notification_failure_is_retryable_without_logging_personal_data(caplog):
    lead_id, notification_id = _create_queued_lead()
    sensitive_message = "synthetic exception detail and private@example.test"
    caplog.set_level(logging.ERROR)

    def fail_authentication(**kwargs):
        raise RuntimeError(sensitive_message)

    with SessionLocal() as db:
        notification = db.get(LeadNotificationOutbox, notification_id)
        assert notification is not None
        attempt_time = notification.next_attempt_at

        assert process_next_notification(
            db,
            sender=fail_authentication,
            now=attempt_time,
            notification_id=notification_id,
        )
        db.refresh(notification)
        lead = db.get(Lead, lead_id)

        assert notification.status == "PENDING"
        assert notification.attempt_count == 1
        assert notification.last_error_code == "RuntimeError"
        assert notification.next_attempt_at >= (
            attempt_time + timedelta(seconds=retry_delay_seconds(1))
        )
        assert lead is not None
        assert lead.status == LeadStatus.NEW

        assert not process_next_notification(
            db,
            sender=fail_authentication,
            now=notification.next_attempt_at - timedelta(seconds=1),
            notification_id=notification_id,
        )

    assert "outbox_id=" in caplog.text
    assert "error_type=RuntimeError" in caplog.text
    assert sensitive_message not in caplog.text
    assert "Synthetic" not in caplog.text
    assert "private@example.test" not in caplog.text


def test_interruption_before_provider_dispatch_does_not_consume_attempt():
    lead_id, notification_id = _create_queued_lead()
    provider_calls = []

    def interrupt_before_provider(**kwargs):
        raise KeyboardInterrupt

    with SessionLocal() as db:
        notification = db.get(LeadNotificationOutbox, notification_id)
        assert notification is not None

        with pytest.raises(KeyboardInterrupt):
            process_next_notification(
                db,
                sender=interrupt_before_provider,
                now=notification.next_attempt_at,
                notification_id=notification_id,
            )

        db.rollback()
        db.refresh(notification)
        assert notification.status == "PENDING"
        assert notification.attempt_count == 0
        assert notification.last_attempt_at is None

        assert process_next_notification(
            db,
            sender=lambda **kwargs: provider_calls.append(kwargs),
            now=notification.next_attempt_at,
            notification_id=notification_id,
        )
        db.refresh(notification)
        assert notification.status == "SENT"
        assert notification.attempt_count == 1

    assert len(provider_calls) == 1
    assert provider_calls[0]["lead_name"].startswith("Synthetic ")
    with SessionLocal() as db:
        assert db.get(Lead, lead_id) is not None


def test_transient_notification_failure_retries_then_marks_sent(monkeypatch):
    lead_id, notification_id = _create_queued_lead()
    attempts = []

    def fail_once_then_succeed(**kwargs):
        attempts.append(kwargs)
        if len(attempts) == 1:
            raise ConnectionError("Synthetic transient failure")

    monkeypatch.setattr(
        "app.services.notification_outbox.send_lead_notification",
        fail_once_then_succeed,
    )

    with SessionLocal() as db:
        notification = db.get(LeadNotificationOutbox, notification_id)
        assert notification is not None

        assert process_next_notification(
            db,
            now=notification.next_attempt_at,
            notification_id=notification_id,
        )
        db.refresh(notification)
        retry_time = notification.next_attempt_at
        assert notification.status == "PENDING"
        assert notification.attempt_count == 1

        assert process_next_notification(
            db,
            now=retry_time,
            notification_id=notification_id,
        )
        db.refresh(notification)
        lead = db.get(Lead, lead_id)

        assert notification.status == "SENT"
        assert notification.attempt_count == 2
        assert notification.sent_at is not None
        assert notification.last_error_code is None
        assert lead is not None
        assert lead.status == LeadStatus.NEW

        assert not process_next_notification(
            db,
            now=utc_now_naive(),
            notification_id=notification_id,
        )

        lead_count = db.scalar(
            select(func.count()).select_from(Lead).where(Lead.id == lead_id)
        )
        assert lead_count == 1

    assert len(attempts) == 2


def test_successful_delivery_with_failed_sent_commit_remains_retryable():
    lead_id, notification_id = _create_queued_lead()
    provider_calls = []

    def successful_provider(**kwargs):
        provider_calls.append(kwargs)

    def fail_delivery_recording(session):
        if session.info.get("fail_delivery_recording"):
            raise RuntimeError("Synthetic database commit failure")

    event.listen(Session, "before_commit", fail_delivery_recording)
    try:
        with pytest.raises(RuntimeError, match="Synthetic database commit failure"):
            with SessionLocal() as db:
                db.info["fail_delivery_recording"] = True
                notification = db.get(
                    LeadNotificationOutbox,
                    notification_id,
                )
                assert notification is not None
                process_next_notification(
                    db,
                    sender=successful_provider,
                    now=notification.next_attempt_at,
                    notification_id=notification_id,
                )
    finally:
        event.remove(Session, "before_commit", fail_delivery_recording)

    with SessionLocal() as db:
        notification = db.get(LeadNotificationOutbox, notification_id)
        assert notification is not None
        assert notification.status == "PENDING"
        assert notification.attempt_count == 0
        assert notification.sent_at is None

        assert process_next_notification(
            db,
            sender=successful_provider,
            now=notification.next_attempt_at,
            notification_id=notification_id,
        )
        db.refresh(notification)
        assert notification.status == "SENT"
        assert notification.attempt_count == 1
        assert db.get(Lead, lead_id) is not None

    assert len(provider_calls) == 2


def test_retry_limit_records_terminal_failure(monkeypatch):
    lead_id, notification_id = _create_queued_lead()
    calls = []

    def always_fail(**kwargs):
        calls.append(kwargs)
        raise RuntimeError("Synthetic Graph unavailable")

    monkeypatch.setattr(
        "app.services.notification_outbox.send_lead_notification",
        always_fail,
    )

    with SessionLocal() as db:
        notification = db.get(LeadNotificationOutbox, notification_id)
        assert notification is not None

        for _ in range(MAX_ATTEMPTS):
            assert process_next_notification(
                db,
                now=notification.next_attempt_at,
                notification_id=notification_id,
            )
            db.refresh(notification)

        assert notification.status == "FAILED"
        assert notification.attempt_count == MAX_ATTEMPTS
        assert notification.last_error_code == "RuntimeError"

        lead = db.get(Lead, lead_id)
        assert lead is not None
        assert lead.status == LeadStatus.NEW

    assert len(calls) == MAX_ATTEMPTS


def test_outbox_row_is_unique_per_lead():
    lead_id, _ = _create_queued_lead()

    with SessionLocal() as db:
        db.add(LeadNotificationOutbox(lead_id=lead_id))

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
        else:
            raise AssertionError("Duplicate notification rows must be rejected.")

        row_count = db.scalar(
            select(func.count())
            .select_from(LeadNotificationOutbox)
            .where(LeadNotificationOutbox.lead_id == lead_id)
        )
        assert row_count == 1
