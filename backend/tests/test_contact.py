from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models.leads import Lead
from app.models.users import User
from database import SessionLocal
from app.core.security import hash_password


client = TestClient(app)

TEST_EMAIL = "test-auth@example.com"
TEST_PASSWORD = "TestPassword123!"


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
        "app.api.contact.send_lead_notification",
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

    response = authenticated_client.get(
        "/api/admin/leads"
    )

    assert response.status_code == 200

    data = response.json()

    assert "leads" in data
    assert isinstance(data["leads"], list)

    authenticated_client.post("/api/auth/logout")

    delete_test_user()


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
