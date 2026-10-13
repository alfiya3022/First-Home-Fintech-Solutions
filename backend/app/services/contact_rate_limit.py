from datetime import datetime, timedelta, timezone
from hashlib import sha256
import ipaddress
import os

from fastapi import HTTPException, Request, status
from sqlalchemy import case, delete, func, select, text
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models.contact_rate_limit import ContactRateLimit


CONTACT_IP_LIMIT = 5
CONTACT_IP_WINDOW_SECONDS = 60
CONTACT_IP_MAX_KEYS = 10_000
_NEW_KEY_LOCK_ID = 1_741_120_261


def get_contact_client_ip(request: Request) -> str:
    peer = request.client
    if peer is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to identify the contact request source.",
        )

    trusted_proxy_ip = os.getenv("TRUSTED_PROXY_IP", "").strip()
    if trusted_proxy_ip and peer.host == trusted_proxy_ip:
        forwarded_ip = request.headers.get("x-real-ip", "").strip()
        try:
            return ipaddress.ip_address(forwarded_ip).compressed
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid client address from the trusted proxy.",
            ) from exc

    try:
        return ipaddress.ip_address(peer.host).compressed
    except ValueError:
        return peer.host


def enforce_contact_ip_rate_limit(
    db: Session,
    client_ip: str,
    *,
    now: datetime | None = None,
) -> None:
    dialect = db.bind.dialect.name
    if dialect not in {"postgresql", "sqlite"}:
        raise RuntimeError(
            f"Contact rate limiting does not support database dialect {dialect!r}."
        )

    current_time = now or datetime.now(timezone.utc).replace(tzinfo=None)
    window_start_cutoff = current_time - timedelta(
        seconds=CONTACT_IP_WINDOW_SECONDS
    )
    ip_hash = sha256(client_ip.encode("utf-8")).hexdigest()

    db.execute(
        delete(ContactRateLimit).where(
            ContactRateLimit.window_started_at <= window_start_cutoff
        )
    )

    known_key = db.scalar(
        select(ContactRateLimit.ip_hash).where(
            ContactRateLimit.ip_hash == ip_hash
        )
    )
    if known_key is None:
        if dialect == "postgresql":
            db.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": _NEW_KEY_LOCK_ID},
            )

            known_key = db.scalar(
                select(ContactRateLimit.ip_hash).where(
                    ContactRateLimit.ip_hash == ip_hash
                )
            )

        if known_key is None:
            key_count = db.scalar(
                select(func.count()).select_from(ContactRateLimit)
            )
            if key_count >= CONTACT_IP_MAX_KEYS:
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Contact submissions are temporarily limited.",
                )

    values = {
        "ip_hash": ip_hash,
        "window_started_at": current_time,
        "request_count": 1,
    }
    if dialect == "postgresql":
        insert_statement = postgresql_insert(ContactRateLimit).values(**values)
    else:
        insert_statement = sqlite_insert(ContactRateLimit).values(**values)

    reset_window = ContactRateLimit.window_started_at <= window_start_cutoff
    statement = (
        insert_statement.on_conflict_do_update(
            index_elements=[ContactRateLimit.ip_hash],
            set_={
                "window_started_at": case(
                    (reset_window, current_time),
                    else_=ContactRateLimit.window_started_at,
                ),
                "request_count": case(
                    (reset_window, 1),
                    (
                        ContactRateLimit.request_count <= CONTACT_IP_LIMIT,
                        ContactRateLimit.request_count + 1,
                    ),
                    else_=CONTACT_IP_LIMIT + 1,
                ),
            },
        )
        .returning(ContactRateLimit.request_count)
    )
    request_count = db.scalar(statement)
    db.commit()

    if request_count > CONTACT_IP_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many contact submissions; please try again later.",
        )
