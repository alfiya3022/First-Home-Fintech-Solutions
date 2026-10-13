import ipaddress
import os
import socket
import tempfile
import sys
from pathlib import Path

from sqlalchemy.engine import URL, make_url


_socket_connect = socket.socket.connect
_socket_connect_ex = socket.socket.connect_ex

if "database" in sys.modules:
    raise RuntimeError(
        "Backend tests require database configuration before application imports."
    )

_temporary_directory = tempfile.TemporaryDirectory(
    prefix="first-home-backend-tests-"
)
TEST_DIRECTORY = Path(_temporary_directory.name).resolve()
TEST_DATABASE_PATH = TEST_DIRECTORY / "test.sqlite3"
TEST_DATABASE_URL = URL.create(
    "sqlite",
    database=str(TEST_DATABASE_PATH),
).render_as_string(hide_password=True)


def validate_test_database_url(
    candidate: str,
    *,
    expected_url: str,
    test_directory: Path,
    database_path: Path,
) -> None:
    if candidate != expected_url:
        raise RuntimeError(
            "Backend tests require the generated temporary SQLite database."
        )

    parsed_url = make_url(candidate)
    expected_directory = test_directory.resolve()
    expected_path = database_path.resolve()

    if (
        parsed_url.get_backend_name() != "sqlite"
        or parsed_url.database is None
        or Path(parsed_url.database).resolve() != expected_path
        or expected_path.parent != expected_directory
    ):
        raise RuntimeError(
            "Backend tests require the generated temporary SQLite database."
        )


validate_test_database_url(
    TEST_DATABASE_URL,
    expected_url=TEST_DATABASE_URL,
    test_directory=TEST_DIRECTORY,
    database_path=TEST_DATABASE_PATH,
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


def _is_loopback_address(address) -> bool:
    if isinstance(address, str):
        return True

    if not isinstance(address, tuple) or not address:
        return False

    host = address[0]
    if host == "localhost":
        return True

    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def deny_external_network(sock, address):
    if not _is_loopback_address(address):
        raise AssertionError("External network access is disabled in backend tests.")

    return _socket_connect(sock, address)


def deny_external_network_ex(sock, address):
    if not _is_loopback_address(address):
        raise AssertionError("External network access is disabled in backend tests.")

    return _socket_connect_ex(sock, address)


def deny_http_request(*args, **kwargs):
    raise AssertionError("HTTP network access is disabled during backend tests.")


def deny_graph_authentication(*args, **kwargs):
    raise AssertionError(
        "Microsoft Graph authentication is disabled during backend tests."
    )


def mock_email_delivery(*args, **kwargs):
    return None


def deny_sharepoint_access(*args, **kwargs):
    raise AssertionError("SharePoint access is disabled during backend tests.")
