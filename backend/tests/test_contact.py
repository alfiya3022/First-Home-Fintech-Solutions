from datetime import datetime, timedelta
from hashlib import sha256
from uuid import uuid4

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import select

import create_admin
from app.core.security import hash_password
from app.main import app
from app.models.contact_rate_limit import ContactRateLimit
from app.models.lead_notification_outbox import LeadNotificationOutbox
from app.models.leads import Lead, LeadStatus
from app.models.users import User
from app.services.contact_rate_limit import (
    enforce_contact_ip_rate_limit,
    get_contact_client_ip,
)
from app.services.notification_outbox import process_next_notification
from database import SessionLocal


client = TestClient(app)

TEST_EMAIL = "test-auth@example.com"
TEST_PASSWORD = "TestPassword123!"


ADMIN_ONLY_REQUESTS = (
    ("GET", "/api/admin/eibor/monitoring", {}),
    ("GET", "/api/admin/leads", {}),
    ("GET", "/api/admin/leads/export", {}),
    ("GET", "/api/admin/leads/1", {}),
    ("PATCH", "/api/admin/leads/1/status", {"json": {"status": "CLOSED"}}),
    ("GET", "/api/admin/cases", {}),
    ("POST", "/api/admin/cases", {"json": {"lead_id": 1}}),
    ("GET", "/api/admin/cases/1", {}),
    ("PATCH", "/api/admin/cases/1/status", {"json": {"status": "OPEN"}}),
    ("PATCH", "/api/admin/cases/1/notes", {"json": {"notes": "Test note"}}),
    ("GET", "/api/admin/cases/1/documents", {}),
    (
        "PATCH",
        "/api/admin/cases/1/documents/1/status",
        {"json": {"status": "RECEIVED"}},
    ),
    (
        "POST",
        "/api/admin/cases/1/documents/1/files",
        {
            "files": {
                "file": (
                    "test.pdf",
                    b"%PDF-1.4\nsynthetic test file",
                    "application/pdf",
                )
            }
        },
    ),
    (
        "GET",
        "/api/admin/cases/1/documents/1/files/1/download",
        {},
    ),
)

AUTHENTICATED_CONSULTANT_REQUESTS = (
    ("GET", "/api/consultant/leads", {}),
    ("GET", "/api/consultant/leads/1", {}),
)


def create_test_user(is_admin=False):
    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == TEST_EMAIL)
        )

        if existing_user:
            existing_user.is_admin = is_admin
            existing_user.is_active = True
            db.commit()
            return

        user = User(
            email=TEST_EMAIL,
            password_hash=hash_password(TEST_PASSWORD),
            full_name="Authentication Test User",
            is_active=True,
            is_admin=is_admin,
        )

        db.add(user)
        db.commit()




def delete_test_user():
    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == TEST_EMAIL)
        )

        if user:
            db.delete(user)
            db.commit()


# -------------------------
# Contact API tests
# -------------------------

def test_submit_contact_enquiry():
    response = client.post(
        "/api/contact",
        json={
            "name": "Automated Test User",
            "email": "automated@example.com",
            "phone": "0501112233",
            "service": "Home Financing",
            "message": "Automated API test enquiry.",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["success"] is True
    assert data["status"] == "NEW"
    assert isinstance(data["lead_id"], int)

    with SessionLocal() as db:
        result = db.execute(
            select(Lead).where(Lead.id == data["lead_id"])
        )

        lead = result.scalar_one()

        assert lead.name == "Automated Test User"
        assert lead.email == "automated@example.com"
        assert lead.service == "Home Financing"
        assert lead.status.value == "NEW"


def test_submit_contact_enquiry_honeypot_does_not_persist_lead():
    email = f"{uuid4().hex}@example.com"
    response = client.post(
        "/api/contact",
        json={
            "name": "Automated Test User",
            "email": email,
            "phone": "0501112233",
            "service": "Home Financing",
            "message": "Automated honeypot test enquiry.",
            "website": "https://bot.example",
        },
    )

    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["lead_id"] == 0
    assert response.json()["status"] == "REJECTED"

    with SessionLocal() as db:
        assert db.scalar(select(Lead).where(Lead.email == email)) is None


def test_contact_email_rate_limit_is_independent_of_forwarded_headers():
    email = f"{uuid4().hex}@example.com"
    payload = {
        "name": "Rate Limit Test",
        "email": email,
        "phone": "0501112233",
        "service": "Home Financing",
        "message": "Testing the email submission rate limit.",
    }

    first = client.post(
        "/api/contact",
        json=payload,
        headers={"X-Forwarded-For": "198.51.100.10"},
    )
    second = client.post(
        "/api/contact",
        json=payload,
        headers={"X-Forwarded-For": "203.0.113.20"},
    )
    third = client.post(
        "/api/contact",
        json=payload,
        headers={"X-Forwarded-For": "192.0.2.30"},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 429

    with SessionLocal() as db:
        leads = db.scalars(select(Lead).where(Lead.email == email)).all()
        assert len(leads) == 2


def test_contact_ip_rate_limit_applies_across_different_emails():
    responses = []
    for index in range(6):
        responses.append(
            client.post(
                "/api/contact",
                json={
                    "name": f"IP Rate Limit Test {index}",
                    "email": f"{uuid4().hex}@example.com",
                    "phone": "0501112233",
                    "service": "Home Financing",
                    "message": "Testing the persistent per-IP rate limit.",
                },
                headers={"X-Forwarded-For": f"198.51.100.{index + 1}"},
            )
        )

    assert [response.status_code for response in responses] == [
        201,
        201,
        201,
        201,
        201,
        429,
    ]


def test_contact_ip_rate_limit_expires_after_its_window():
    first_hit = datetime(2026, 1, 1, 12, 0, 0)
    client_ip = "203.0.113.25"

    with SessionLocal() as db:
        enforce_contact_ip_rate_limit(
            db,
            client_ip,
            now=first_hit,
        )
        enforce_contact_ip_rate_limit(
            db,
            client_ip,
            now=first_hit + timedelta(seconds=60),
        )

        rate_limit = db.get(
            ContactRateLimit,
            sha256(client_ip.encode("utf-8")).hexdigest(),
        )
        assert rate_limit is not None
        assert rate_limit.window_started_at == first_hit + timedelta(seconds=60)
        assert rate_limit.request_count == 1


def test_forwarded_client_ip_is_trusted_only_from_configured_nginx(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_IP", "172.30.0.2")

    def make_request(peer_ip):
        return Request(
            {
                "type": "http",
                "asgi": {"version": "3.0"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "https",
                "path": "/api/contact",
                "raw_path": b"/api/contact",
                "query_string": b"",
                "headers": [(b"x-real-ip", b"198.51.100.75")],
                "client": (peer_ip, 12345),
                "server": ("testserver", 443),
            }
        )

    assert get_contact_client_ip(make_request("192.0.2.10")) == "192.0.2.10"
    assert get_contact_client_ip(make_request("172.30.0.2")) == "198.51.100.75"


def test_contact_rate_limit_rejects_new_keys_when_storage_is_full(monkeypatch):
    monkeypatch.setattr(
        "app.services.contact_rate_limit.CONTACT_IP_MAX_KEYS",
        0,
    )

    response = client.post(
        "/api/contact",
        json={
            "name": "Rate Limit Capacity Test",
            "email": f"{uuid4().hex}@example.com",
            "phone": "0501112233",
            "service": "Home Financing",
            "message": "Testing bounded rate limiter storage.",
        },
    )

    assert response.status_code == 429


def test_submit_contact_enquiry_sends_email(monkeypatch):
    email_calls = []

    def mock_send_lead_notification(
        lead_name,
        lead_email,
        lead_phone,
        lead_service,
        lead_message,
    ):
        email_calls.append(
            {
                "lead_name": lead_name,
                "lead_email": lead_email,
                "lead_phone": lead_phone,
                "lead_service": lead_service,
                "lead_message": lead_message,
            }
        )

    monkeypatch.setattr(
        "app.services.notification_outbox.send_lead_notification",
        mock_send_lead_notification,
    )

    response = client.post(
        "/api/contact",
        json={
            "name": "Email Test User",
            "email": "emailtest@example.com",
            "phone": "0501234567",
            "service": "Home Financing",
            "message": "Testing the email notification integration.",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert set(data) == {"success", "message", "lead_id", "status"}
    assert data["success"] is True
    assert data["status"] == "NEW"

    with SessionLocal() as db:
        notification = db.scalar(
            select(LeadNotificationOutbox).where(
                LeadNotificationOutbox.lead_id == data["lead_id"]
            )
        )
        assert notification is not None
        assert notification.status == "PENDING"
        assert notification.attempt_count == 0
        assert email_calls == []

        assert process_next_notification(
            db,
            now=notification.next_attempt_at,
            notification_id=notification.id,
        )
        db.refresh(notification)

        assert notification.status == "SENT"
        assert len(email_calls) == 1
        assert email_calls[0] == {
            "lead_name": "Email Test User",
            "lead_email": "emailtest@example.com",
            "lead_phone": "0501234567",
            "lead_service": "Home Financing",
            "lead_message": "Testing the email notification integration.",
        }


def test_submit_contact_enquiry_invalid_service():
    response = client.post(
        "/api/contact",
        json={
            "name": "Invalid Service Test",
            "email": "invalid@example.com",
            "phone": "0501112244",
            "service": "Fake Service",
            "message": "This should be rejected by the API.",
        },
    )

    assert response.status_code == 422

    data = response.json()

    assert data["detail"] == "Invalid service selected."

    with SessionLocal() as db:
        assert db.scalar(
            select(Lead).where(Lead.email == "invalid@example.com")
        ) is None
        assert db.scalar(
            select(LeadNotificationOutbox).join(Lead).where(
                Lead.email == "invalid@example.com"
            )
        ) is None


def test_submit_contact_enquiry_database_failure(monkeypatch):
    class FailingSession:
        def add(self, lead):
            raise Exception("Database failure")

        def rollback(self):
            pass

        def close(self):
            pass

    def mock_session_local():
        return FailingSession()

    monkeypatch.setattr(
        "app.core.database.SessionLocal",
        mock_session_local,
    )
    monkeypatch.setattr(
        "app.api.contact.enforce_contact_ip_rate_limit",
        lambda *args, **kwargs: None,
    )

    response = client.post(
        "/api/contact",
        json={
            "name": "Database Failure Test",
            "email": "dbfailure@example.com",
            "phone": "0501122255",
            "service": "Home Financing",
            "message": "This should trigger the database error handling.",
        },
    )

    assert response.status_code == 503

    data = response.json()

    assert (
        data["detail"]
        == "We couldn't submit your enquiry right now. "
        "Please try again later."
    )

    with SessionLocal() as db:
        assert db.scalar(
            select(Lead).where(Lead.email == "dbfailure@example.com")
        ) is None


def test_submit_contact_enquiry_commit_failure_rolls_back_lead_and_outbox(
    monkeypatch,
):
    class FailingCommitSession:
        def __init__(self):
            self.records = []
            self.rollback_called = False

        def add(self, record):
            self.records.append(record)

        def flush(self):
            self.records[0].id = 999_999_999
            self.records[0].status = LeadStatus.NEW

        def commit(self):
            raise RuntimeError("Synthetic commit failure")

        def rollback(self):
            self.rollback_called = True

        def close(self):
            pass

    db = FailingCommitSession()
    monkeypatch.setattr("app.core.database.SessionLocal", lambda: db)
    monkeypatch.setattr(
        "app.api.contact.enforce_contact_ip_rate_limit",
        lambda *args, **kwargs: None,
    )

    response = client.post(
        "/api/contact",
        json={
            "name": "Commit Failure Test",
            "email": "commitfailure@example.com",
            "phone": "0501122255",
            "service": "Home Financing",
            "message": "This should roll back the lead and its outbox row.",
        },
    )

    assert response.status_code == 503
    assert db.rollback_called
    assert len(db.records) == 2
    assert isinstance(db.records[0], Lead)
    assert isinstance(db.records[1], LeadNotificationOutbox)


# -------------------------
# Authentication tests
# -------------------------

def test_login_success():
    create_test_user()

    response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["message"] == "Login successful."

    assert "session_id" in response.cookies

    delete_test_user()


def test_login_cookie_is_secure_in_production(monkeypatch):
    create_test_user()
    monkeypatch.setattr("app.api.auth.IS_PRODUCTION", True)

    response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200
    set_cookie = response.headers["set-cookie"]
    assert "session_id=" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "secure" in set_cookie.lower()

    client.post("/api/auth/logout")
    delete_test_user()


def test_login_invalid_password():
    create_test_user()

    response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": "DefinitelyWrongPassword!",
        },
    )

    assert response.status_code == 401

    data = response.json()

    assert data["detail"] == "Invalid email or password."

    delete_test_user()


def test_admin_leads_requires_authentication():
    unauthenticated_client = TestClient(app)

    response = unauthenticated_client.get(
        "/api/admin/leads"
    )

    assert response.status_code == 401

    data = response.json()

    assert data["detail"] == "Authentication required."


def test_authenticated_admin_leads():
    create_test_user(is_admin=True)

    authenticated_client = TestClient(app)

    login_response = authenticated_client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    current_user = authenticated_client.get("/api/auth/me")
    assert current_user.status_code == 200
    assert current_user.json()["is_admin"] is True

    response = authenticated_client.get(
        "/api/admin/leads"
    )

    assert response.status_code == 200

    data = response.json()

    assert "leads" in data
    assert isinstance(data["leads"], list)

    authenticated_client.post("/api/auth/logout")

    delete_test_user()


def test_create_admin_script_creates_an_administrator(monkeypatch):
    with SessionLocal() as db:
        existing = db.scalar(
            select(User).where(User.email == "new-admin-role@example.com")
        )
        if existing is not None:
            db.delete(existing)
            db.commit()

    answers = iter(["new-admin-role@example.com", "New Admin"])
    monkeypatch.setattr("builtins.input", lambda _: next(answers))
    password_answers = iter(["TestPassword123!", "TestPassword123!"])
    monkeypatch.setattr(
        create_admin.getpass,
        "getpass",
        lambda _: next(password_answers),
    )

    try:
        create_admin.main()
        with SessionLocal() as db:
            user = db.scalar(
                select(User).where(
                    User.email == "new-admin-role@example.com"
                )
            )
            assert user is not None
            assert user.is_admin is True
            original_id = user.id

        rerun_answers = iter(["new-admin-role@example.com", "New Admin"])
        monkeypatch.setattr("builtins.input", lambda _: next(rerun_answers))
        create_admin.main()

        with SessionLocal() as db:
            matching_users = db.scalars(
                select(User).where(User.email == "new-admin-role@example.com")
            ).all()
            assert len(matching_users) == 1
            assert matching_users[0].id == original_id
            assert matching_users[0].is_admin is True
    finally:
        with SessionLocal() as db:
            user = db.scalar(
                select(User).where(
                    User.email == "new-admin-role@example.com"
                )
            )
            if user is not None:
                db.delete(user)
                db.commit()


def test_create_admin_script_requires_confirmation_to_promote_existing_user(
    monkeypatch,
):
    email = "existing-admin-promotion@example.com"
    with SessionLocal() as db:
        user = User(
            email=email,
            password_hash=hash_password(TEST_PASSWORD),
            full_name="Existing Account",
            is_active=True,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        user_id = user.id

    answers = iter([email, "Existing Account", "PROMOTE"])
    monkeypatch.setattr("builtins.input", lambda _: next(answers))
    monkeypatch.setattr(
        create_admin.getpass,
        "getpass",
        lambda _: pytest.fail(
            "Existing-account promotion must not request a password."
        ),
    )

    try:
        create_admin.main()
        with SessionLocal() as db:
            user = db.get(User, user_id)
            assert user is not None
            assert user.is_admin is True
    finally:
        with SessionLocal() as db:
            user = db.get(User, user_id)
            if user is not None:
                db.delete(user)
                db.commit()


def test_logout_invalidates_session():
    create_test_user()

    authenticated_client = TestClient(app)

    login_response = authenticated_client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    logout_response = authenticated_client.post(
        "/api/auth/logout"
    )

    assert logout_response.status_code == 200

    data = logout_response.json()

    assert data["success"] is True
    assert data["message"] == "Logout successful."

    me_response = authenticated_client.get(
        "/api/auth/me"
    )

    assert me_response.status_code == 401

    delete_test_user()



def test_regular_user_forbidden_from_admin_leads():
    create_test_user(is_admin=False)

    regular_client = TestClient(app)

    login_response = regular_client.post(
        "/api/auth/login",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    response = regular_client.get("/api/admin/leads")

    assert response.status_code == 403
    assert response.json() == {"detail": "Administrator access required."}


def test_authenticated_consultant_can_read_minimal_leads_and_details():
    create_test_user(is_admin=False)
    regular_client = TestClient(app)
    with SessionLocal() as db:
        lead = Lead(
            name="Test Consultant Lead",
            email="lead@example.com",
            phone="+971500000000",
            service="Mortgage",
            message="Test enquiry details",
            status=LeadStatus.NEW,
        )
        db.add(lead)
        db.commit()
        lead_id = lead.id

    try:
        login_response = regular_client.post(
            "/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            },
        )
        assert login_response.status_code == 200

        current_user = regular_client.get("/api/auth/me")
        assert current_user.status_code == 200
        assert current_user.json()["is_admin"] is False

        lead_list = regular_client.get("/api/consultant/leads")
        assert lead_list.status_code == 200
        listed_lead = next(
            item for item in lead_list.json()["leads"] if item["id"] == lead_id
        )
        assert listed_lead == {
            "id": lead_id,
            "name": "Test Consultant Lead",
            "email": "lead@example.com",
            "phone": "+971500000000",
            "service": "Mortgage",
            "status": "NEW",
            "created_at": listed_lead["created_at"],
        }
        assert "message" not in listed_lead
        assert "updated_at" not in listed_lead

        lead_details = regular_client.get(
            f"/api/consultant/leads/{lead_id}"
        )
        assert lead_details.status_code == 200
        assert lead_details.json()["message"] == "Test enquiry details"

        admin_leads = regular_client.get("/api/admin/leads")
        assert admin_leads.status_code == 403
    finally:
        regular_client.post("/api/auth/logout")
        with SessionLocal() as db:
            db.delete(db.get(Lead, lead_id))
            db.commit()
        delete_test_user()


def test_consultant_lead_reads_require_authentication():
    unauthenticated_client = TestClient(app)

    for method, path, request_options in AUTHENTICATED_CONSULTANT_REQUESTS:
        response = unauthenticated_client.request(
            method,
            path,
            **request_options,
        )
        assert response.status_code == 401, f"{method} {path}"


def test_all_sensitive_routes_reject_unauthenticated_users():
    unauthenticated_client = TestClient(app)

    for method, path, request_options in ADMIN_ONLY_REQUESTS:
        response = unauthenticated_client.request(
            method,
            path,
            **request_options,
        )
        assert response.status_code == 401, f"{method} {path}"


def test_all_sensitive_routes_forbid_regular_users():
    create_test_user(is_admin=False)
    regular_client = TestClient(app)

    try:
        login_response = regular_client.post(
            "/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            },
        )
        assert login_response.status_code == 200

        for method, path, request_options in ADMIN_ONLY_REQUESTS:
            response = regular_client.request(
                method,
                path,
                **request_options,
            )
            assert response.status_code == 403, f"{method} {path}"
    finally:
        regular_client.post("/api/auth/logout")
        delete_test_user()
