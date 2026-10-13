import os
import re
from threading import Event, Thread
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from app.models.lead_notification_outbox import LeadNotificationOutbox
from app.models.leads import Lead, LeadStatus
from app.services.notification_outbox import process_next_notification


POSTGRES_TEST_DATABASE_URL = os.getenv("POSTGRES_TEST_DATABASE_URL")
POSTGRES_TEST_APPROVED = (
    os.getenv("FIRST_HOME_ALLOW_POSTGRES_TESTS") == "true"
)

pytestmark = pytest.mark.skipif(
    not POSTGRES_TEST_DATABASE_URL or not POSTGRES_TEST_APPROVED,
    reason=(
        "Set POSTGRES_TEST_DATABASE_URL and "
        "FIRST_HOME_ALLOW_POSTGRES_TESTS=true for an approved disposable database."
    ),
)


@pytest.fixture
def postgres_sessions():
    parsed_url = make_url(POSTGRES_TEST_DATABASE_URL)
    if (
        parsed_url.get_backend_name() != "postgresql"
        or parsed_url.host not in {"127.0.0.1", "localhost", "::1"}
        or not parsed_url.database
        or not (
            re.fullmatch(
                r"first_home_test(?:_[a-f0-9]+)?",
                parsed_url.database,
            )
            or (
                os.getenv("GITHUB_ACTIONS") == "true"
                and parsed_url.database == "first_home_ci"
            )
        )
    ):
        raise RuntimeError(
            "PostgreSQL integration tests require a loopback disposable "
            "first_home_test database (or the isolated GitHub Actions CI database)."
        )

    engine = create_engine(POSTGRES_TEST_DATABASE_URL, pool_pre_ping=True)
    schema = f"notification_outbox_test_{uuid4().hex}"
    isolated_engine = None
    try:
        with engine.begin() as connection:
            connection.execute(CreateSchema(schema))

        isolated_engine = create_engine(
            POSTGRES_TEST_DATABASE_URL,
            connect_args={"options": f"-csearch_path={schema}"},
            pool_pre_ping=True,
        ).execution_options(
            schema_translate_map={None: schema}
        )
        Lead.__table__.create(isolated_engine)
        LeadNotificationOutbox.__table__.create(isolated_engine)
        yield sessionmaker(bind=isolated_engine, expire_on_commit=False)
    finally:
        if isolated_engine is not None:
            isolated_engine.dispose()
        with engine.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        engine.dispose()


def test_postgres_workers_do_not_claim_the_same_notification(
    postgres_sessions,
):
    provider_entered = Event()
    release_provider = Event()
    provider_calls = []
    worker_results = []
    worker_errors = []

    with postgres_sessions() as db:
        lead = Lead(
            name="Concurrent outbox test",
            email="concurrent@example.test",
            phone="0501234567",
            service="Home Financing",
            message="Synthetic concurrency test.",
            status=LeadStatus.NEW,
        )
        db.add(lead)
        db.flush()
        notification = LeadNotificationOutbox(lead_id=lead.id)
        db.add(notification)
        db.commit()
        notification_id = notification.id
        due_at = notification.next_attempt_at

    def blocking_provider(**kwargs):
        provider_calls.append(kwargs)
        provider_entered.set()
        if not release_provider.wait(timeout=10):
            raise TimeoutError("Synthetic provider wait timed out.")

    def run_first_worker():
        try:
            with postgres_sessions() as db:
                worker_results.append(
                    process_next_notification(
                        db,
                        sender=blocking_provider,
                        now=due_at,
                        notification_id=notification_id,
                    )
                )
        except BaseException as error:
            worker_errors.append(error)

    worker = Thread(target=run_first_worker)
    worker.start()
    try:
        assert provider_entered.wait(timeout=10)

        with postgres_sessions() as db:
            assert not process_next_notification(
                db,
                sender=lambda **kwargs: provider_calls.append(kwargs),
                now=due_at,
                notification_id=notification_id,
            )
    finally:
        release_provider.set()
        worker.join(timeout=10)

    assert not worker.is_alive()
    assert not worker_errors
    assert worker_results == [True]
    assert len(provider_calls) == 1

    with postgres_sessions() as db:
        notification = db.scalar(
            select(LeadNotificationOutbox).where(
                LeadNotificationOutbox.id == notification_id
            )
        )
        assert notification is not None
        assert notification.status == "SENT"
        assert notification.attempt_count == 1
