import socket
from pathlib import Path

import httpx
import msal
import pytest
import requests

from tests import isolation
from app.api import admin_case_documents
from database import engine
from app.services import notification_outbox


def test_database_guard_accepts_generated_temporary_database():
    assert engine.url.render_as_string(hide_password=True) == isolation.TEST_DATABASE_URL
    isolation.validate_test_database_url(
        isolation.TEST_DATABASE_URL,
        expected_url=isolation.TEST_DATABASE_URL,
        test_directory=isolation.TEST_DIRECTORY,
        database_path=isolation.TEST_DATABASE_PATH,
    )


@pytest.mark.parametrize(
    "candidate",
    [
        "postgresql://db.example.invalid/application",
        "sqlite:///existing-application.sqlite3",
        "sqlite:///:memory:",
    ],
)
def test_database_guard_rejects_non_isolated_database_urls(candidate):
    with pytest.raises(RuntimeError, match="generated temporary SQLite database"):
        isolation.validate_test_database_url(
            candidate,
            expected_url=isolation.TEST_DATABASE_URL,
            test_directory=isolation.TEST_DIRECTORY,
            database_path=isolation.TEST_DATABASE_PATH,
        )


def test_external_service_guards_are_installed():
    assert socket.socket.connect is isolation.deny_external_network
    assert socket.socket.connect_ex is isolation.deny_external_network_ex
    assert requests.sessions.Session.request is isolation.deny_http_request
    assert httpx.AsyncClient.request is isolation.deny_http_request
    assert msal.ConfidentialClientApplication is isolation.deny_graph_authentication
    assert (
        notification_outbox.send_lead_notification
        is isolation.mock_email_delivery
    )
    assert (
        admin_case_documents.get_sharepoint_service
        is isolation.deny_sharepoint_access
    )


def test_external_network_guard_rejects_non_loopback_before_connecting():
    with pytest.raises(AssertionError, match="External network access is disabled"):
        isolation.deny_external_network(None, ("203.0.113.1", 443))

    with pytest.raises(AssertionError, match="External network access is disabled"):
        isolation.deny_external_network_ex(None, ("203.0.113.1", 443))


def test_database_guard_checks_temporary_directory_boundary():
    unrelated_directory = Path(isolation.TEST_DIRECTORY.parent) / "unrelated"

    with pytest.raises(RuntimeError, match="generated temporary SQLite database"):
        isolation.validate_test_database_url(
            isolation.TEST_DATABASE_URL,
            expected_url=isolation.TEST_DATABASE_URL,
            test_directory=unrelated_directory,
            database_path=isolation.TEST_DATABASE_PATH,
        )
