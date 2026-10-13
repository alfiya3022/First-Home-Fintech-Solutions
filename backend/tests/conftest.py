import socket

import httpx
import msal
import pytest
import requests
from sqlalchemy import delete

from tests import isolation

from app.models.contact_rate_limit import ContactRateLimit
from app.models.eibor_rate import EiborMonitoring, EiborRate
from database import Base, SessionLocal, engine
import app.main


@pytest.fixture(scope="session", autouse=True)
def isolated_test_database():
    try:
        Base.metadata.create_all(bind=engine)
        yield
    finally:
        try:
            Base.metadata.drop_all(bind=engine)
        finally:
            engine.dispose()
            isolation._temporary_directory.cleanup()


@pytest.fixture(autouse=True)
def block_external_services(monkeypatch):
    monkeypatch.setattr(socket.socket, "connect", isolation.deny_external_network)
    monkeypatch.setattr(
        socket.socket,
        "connect_ex",
        isolation.deny_external_network_ex,
    )
    monkeypatch.setattr(
        requests.sessions.Session,
        "request",
        isolation.deny_http_request,
    )
    monkeypatch.setattr(
        httpx.AsyncClient,
        "request",
        isolation.deny_http_request,
    )
    monkeypatch.setattr(
        msal,
        "ConfidentialClientApplication",
        isolation.deny_graph_authentication,
    )
    monkeypatch.setattr(
        "app.services.notification_outbox.send_lead_notification",
        isolation.mock_email_delivery,
    )
    monkeypatch.setattr(
        "app.api.admin_case_documents.get_sharepoint_service",
        isolation.deny_sharepoint_access,
    )


@pytest.fixture(autouse=True)
def clear_contact_rate_limits():
    with SessionLocal() as db:
        db.execute(delete(ContactRateLimit))
        db.commit()
