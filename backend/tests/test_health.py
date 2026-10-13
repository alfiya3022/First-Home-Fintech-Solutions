from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import app
from database import engine


client = TestClient(app)


def test_readiness_check_succeeds_when_database_is_available():
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_check_fails_without_exposing_database_error(monkeypatch):
    def fail_to_connect():
        raise SQLAlchemyError("Synthetic internal database details")

    monkeypatch.setattr(engine, "connect", fail_to_connect)

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable."}
    assert "Synthetic internal database details" not in response.text


def test_liveness_check_remains_available_when_database_is_unavailable(
    monkeypatch,
):
    def fail_to_connect():
        raise SQLAlchemyError("Synthetic internal database details")

    monkeypatch.setattr(engine, "connect", fail_to_connect)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
