import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.api.admin_cases import lock_case_reference_generation


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
            "Case concurrency tests require a loopback disposable "
            "first_home_test database."
        )

    engine = create_engine(POSTGRES_TEST_DATABASE_URL, pool_pre_ping=True)
    try:
        yield sessionmaker(bind=engine)
    finally:
        engine.dispose()


def test_postgres_case_reference_lock_serializes_concurrent_transactions(
    postgres_sessions,
):
    start_together = threading.Barrier(2)
    state_lock = threading.Lock()
    active_transactions = 0
    max_active_transactions = 0

    def run_transaction():
        nonlocal active_transactions, max_active_transactions
        start_together.wait()
        with postgres_sessions() as db:
            lock_case_reference_generation(db)
            with state_lock:
                active_transactions += 1
                max_active_transactions = max(
                    max_active_transactions,
                    active_transactions,
                )
            time.sleep(0.1)
            with state_lock:
                active_transactions -= 1
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(run_transaction) for _ in range(2)]
        for future in futures:
            future.result(timeout=10)

    assert max_active_transactions == 1
