import os
import re
from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

from app.models.contact_rate_limit import ContactRateLimit
from app.services.contact_rate_limit import (
    CONTACT_IP_LIMIT,
    enforce_contact_ip_rate_limit,
)


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
    database_url = POSTGRES_TEST_DATABASE_URL
    parsed_url = make_url(database_url)
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

    engine = create_engine(database_url, pool_pre_ping=True)
    schema = f"contact_limit_test_{uuid4().hex}"
    try:
        with engine.begin() as connection:
            connection.execute(CreateSchema(schema))

        isolated_engine = engine.execution_options(
            schema_translate_map={None: schema}
        )
        ContactRateLimit.__table__.create(isolated_engine)
        yield sessionmaker(bind=isolated_engine, expire_on_commit=False)
    finally:
        with engine.begin() as connection:
            connection.execute(DropSchema(schema, cascade=True))
        engine.dispose()


def test_postgres_contact_limit_enforces_per_ip_limit_and_expiry(
    postgres_sessions,
):
    first_hit = datetime(2026, 1, 1, 12, 0, 0)
    client_ip = "203.0.113.150"

    with postgres_sessions() as db:
        for attempt in range(CONTACT_IP_LIMIT):
            enforce_contact_ip_rate_limit(
                db,
                client_ip,
                now=first_hit + timedelta(seconds=attempt),
            )

        with pytest.raises(HTTPException) as error:
            enforce_contact_ip_rate_limit(
                db,
                client_ip,
                now=first_hit + timedelta(seconds=CONTACT_IP_LIMIT),
            )
        assert error.value.status_code == 429

        row_count = db.scalar(
            select(func.count()).select_from(ContactRateLimit)
        )
        assert row_count == 1

        enforce_contact_ip_rate_limit(
            db,
            client_ip,
            now=first_hit + timedelta(seconds=60),
        )

        limit = db.scalar(select(ContactRateLimit))
        assert limit is not None
        assert limit.request_count == 1
        assert limit.window_started_at == first_hit + timedelta(seconds=60)
