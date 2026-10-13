
import logging
import time
from collections import deque
from hashlib import sha256
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    normalize_email,
    normalize_phone_number,
    sanitize_text,
)
from app.models.lead_notification_outbox import LeadNotificationOutbox
from app.models.leads import Lead
from app.services.contact_rate_limit import (
    enforce_contact_ip_rate_limit,
    get_contact_client_ip,
)
from app.schemas.contact import (
    ContactRequest,
    ContactResponse,
    SERVICE_OPTIONS,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Contact"])

_CONTACT_EMAIL_LIMIT = 2
_CONTACT_EMAIL_WINDOW_SECONDS = 900
_CONTACT_RATE_LIMIT_MAX_KEYS = 10_000
_CONTACT_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS = 60
_CONTACT_RATE_LIMITS: dict[str, deque[float]] = {}
_CONTACT_RATE_LIMIT_LOCK = Lock()
_last_rate_limit_cleanup = 0.0


def _enforce_contact_rate_limit(email: str) -> None:
    now = time.monotonic()
    email_key = sha256(email.casefold().encode("utf-8")).hexdigest()

    global _last_rate_limit_cleanup
    with _CONTACT_RATE_LIMIT_LOCK:
        if (
            now - _last_rate_limit_cleanup
            >= _CONTACT_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS
        ):
            expired_keys = [
                key
                for key, bucket in _CONTACT_RATE_LIMITS.items()
                if not bucket
                or now - bucket[-1] > _CONTACT_EMAIL_WINDOW_SECONDS
            ]
            for key in expired_keys:
                del _CONTACT_RATE_LIMITS[key]
            _last_rate_limit_cleanup = now

        bucket = _CONTACT_RATE_LIMITS.get(email_key)
        if bucket is not None:
            while (
                bucket
                and now - bucket[0] > _CONTACT_EMAIL_WINDOW_SECONDS
            ):
                bucket.popleft()

            if not bucket:
                del _CONTACT_RATE_LIMITS[email_key]
                bucket = None

        if bucket is not None and len(bucket) >= _CONTACT_EMAIL_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many contact submissions; please try again later.",
            )

        if bucket is None:
            if len(_CONTACT_RATE_LIMITS) >= _CONTACT_RATE_LIMIT_MAX_KEYS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many contact submissions; please try again later.",
                )
            bucket = deque()
            _CONTACT_RATE_LIMITS[email_key] = bucket

        bucket.append(now)


@router.post(
    "/contact",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_contact_enquiry(
    payload: ContactRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # Honeypot: genuine visitors should leave this hidden field empty.
    # Silently discard bot submissions without saving a lead or sending email.
    if payload.website.strip():
        logger.warning("Contact submission rejected by honeypot.")
        return {
            "success": True,
            "message": "Your enquiry has been submitted successfully.",
            "lead_id": 0,
            "status": "REJECTED",
        }

    try:
        normalized_email = normalize_email(payload.email)
        normalized_phone = normalize_phone_number(payload.phone)
        normalized_name = sanitize_text(
            payload.name,
            field_name="Name",
            max_length=100,
        )
        normalized_service = sanitize_text(
            payload.service,
            field_name="Service",
            max_length=100,
        )
        normalized_message = sanitize_text(
            payload.message,
            field_name="Message",
            max_length=2000,
            allow_newlines=True,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if normalized_service not in SERVICE_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid service selected.",
        )

    _enforce_contact_rate_limit(normalized_email)
    try:
        enforce_contact_ip_rate_limit(
            db,
            get_contact_client_ip(request),
        )
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        logger.error(
            "Contact IP rate-limit storage failed; error_type=%s",
            type(error).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't submit your enquiry right now. Please try again later.",
        ) from error

    lead = Lead(
        name=normalized_name,
        email=normalized_email,
        phone=normalized_phone,
        service=normalized_service,
        message=normalized_message,
    )

    try:
        db.add(lead)
        db.flush()
        db.add(
            LeadNotificationOutbox(
                lead_id=lead.id,
            )
        )
        response = {
            "success": True,
            "message": "Your enquiry has been submitted successfully.",
            "lead_id": lead.id,
            "status": lead.status.value,
        }
        db.commit()

    except Exception as error:
        db.rollback()
        logger.error(
            "Contact lead/outbox transaction failed; persistence outcome may "
            "be uncertain. error_type=%s",
            type(error).__name__,
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't submit your enquiry right now. Please try again later.",
        )

    return response
