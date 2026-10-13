import logging
import time

from database import SessionLocal
from app.services.eibor_service import (
    update_eibor_rates,
)
from app.services.notification_outbox import process_next_notification


logger = logging.getLogger(__name__)
POLL_INTERVAL_SECONDS = 5


def run_worker() -> None:
    while True:
        try:
            with SessionLocal() as db:
                update_eibor_rates(db, only_if_due=True)
        except Exception as error:
            logger.error(
                "EIBOR monitoring check completed. status=failed "
                "stored_rates_preserved=true error_type=%s",
                type(error).__name__,
            )

        try:
            with SessionLocal() as db:
                processed = process_next_notification(db)
        except Exception as error:
            logger.error(
                "Notification worker cycle failed. error_type=%s",
                type(error).__name__,
            )
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        if not processed:
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_worker()
