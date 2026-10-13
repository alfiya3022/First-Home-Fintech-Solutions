import logging
from collections.abc import Callable
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead_notification_outbox import (
    LeadNotificationOutbox,
    utc_now_naive,
)
from app.models.leads import Lead
from app.services.email_service import send_lead_notification


logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
RETRY_BASE_SECONDS = 30
RETRY_MAX_SECONDS = 3600


def retry_delay_seconds(attempt_count: int) -> int:
    return min(
        RETRY_BASE_SECONDS * 2 ** max(attempt_count - 1, 0),
        RETRY_MAX_SECONDS,
    )


def process_next_notification(
    db: Session,
    *,
    sender: Callable[..., None] | None = None,
    now: datetime | None = None,
    notification_id: int | None = None,
) -> bool:
    current_time = now or utc_now_naive()
    query = (
        select(LeadNotificationOutbox)
        .where(
            LeadNotificationOutbox.status == "PENDING",
            LeadNotificationOutbox.next_attempt_at <= current_time,
        )
        .order_by(
            LeadNotificationOutbox.next_attempt_at,
            LeadNotificationOutbox.id,
        )
    )
    if notification_id is not None:
        query = query.where(LeadNotificationOutbox.id == notification_id)

    query = query.with_for_update(skip_locked=True).limit(1)
    outbox = db.scalar(query)

    if outbox is None:
        return False

    if outbox.attempt_count >= MAX_ATTEMPTS:
        outbox.status = "FAILED"
        outbox.last_error_code = "RetryLimitReached"
        db.commit()
        logger.error(
            "Lead notification exhausted its retry limit. "
            "outbox_id=%s lead_id=%s",
            outbox.id,
            outbox.lead_id,
        )
        return True

    lead = db.get(Lead, outbox.lead_id)
    if lead is None:
        outbox.status = "FAILED"
        outbox.last_error_code = "LeadNotFound"
        db.commit()
        logger.error(
            "Lead notification references a missing lead. "
            "outbox_id=%s lead_id=%s",
            outbox.id,
            outbox.lead_id,
        )
        return True

    lead_id = outbox.lead_id
    outbox_id = outbox.id
    message = {
        "lead_name": lead.name,
        "lead_email": lead.email,
        "lead_phone": lead.phone,
        "lead_service": lead.service,
        "lead_message": lead.message,
    }

    try:
        (sender or send_lead_notification)(**message)
    except Exception as error:
        outbox.attempt_count += 1
        outbox.last_attempt_at = current_time
        if outbox.attempt_count >= MAX_ATTEMPTS:
            outbox.status = "FAILED"
        else:
            outbox.status = "PENDING"
            outbox.next_attempt_at = utc_now_naive() + timedelta(
                seconds=retry_delay_seconds(outbox.attempt_count)
            )

        outbox.last_error_code = type(error).__name__[:100]
        db.commit()
        logger.error(
            "Lead notification attempt failed. "
            "outbox_id=%s lead_id=%s attempt=%s error_type=%s status=%s",
            outbox_id,
            lead_id,
            outbox.attempt_count,
            outbox.last_error_code,
            outbox.status,
        )
        return True

    outbox.attempt_count += 1
    outbox.last_attempt_at = current_time
    outbox.status = "SENT"
    outbox.sent_at = utc_now_naive()
    outbox.last_error_code = None
    db.commit()
    logger.info(
        "Lead notification accepted by Graph. outbox_id=%s lead_id=%s",
        outbox_id,
        lead_id,
    )
    return True
