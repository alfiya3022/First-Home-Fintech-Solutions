from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.api.admin_cases import lock_case_reference_generation
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.cases import Case, CaseStatus
from app.models.leads import Lead, LeadStatus
from app.models.users import User
from database import SessionLocal


client = TestClient(app)
TEST_PASSWORD = "CaseWorkflowTest123!"


def create_user(is_admin: bool) -> User:
    with SessionLocal() as db:
        user = User(
            email=f"{uuid4().hex}@example.com",
            password_hash=hash_password(TEST_PASSWORD),
            full_name="Case Workflow Test",
            is_active=True,
            is_admin=is_admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


def create_lead(status: LeadStatus) -> Lead:
    with SessionLocal() as db:
        lead = Lead(
            name="Case Workflow Lead",
            email=f"{uuid4().hex}@example.com",
            phone="+971500000000",
            service="Home Financing",
            message="Test lead for case workflow.",
            status=status,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead


def remove_records(user_ids: list[int], lead_ids: list[int]) -> None:
    with SessionLocal() as db:
        db.execute(delete_cases_for_leads(lead_ids))
        for lead_id in lead_ids:
            lead = db.get(Lead, lead_id)
            if lead is not None:
                db.delete(lead)
        for user_id in user_ids:
            user = db.get(User, user_id)
            if user is not None:
                db.delete(user)
        db.commit()


def delete_cases_for_leads(lead_ids: list[int]):
    return Case.__table__.delete().where(Case.lead_id.in_(lead_ids))


def login_as(user: User) -> TestClient:
    authenticated_client = TestClient(app)
    response = authenticated_client.post(
        "/api/auth/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    return authenticated_client


def test_case_summary_detail_and_creation_authorization():
    admin = create_user(is_admin=True)
    consultant = create_user(is_admin=False)
    contacted_lead = create_lead(LeadStatus.CONTACTED)
    new_lead = create_lead(LeadStatus.NEW)
    lead_ids = [contacted_lead.id, new_lead.id]

    case_reference_prefix = f"FH-{datetime.now().year}-"
    with SessionLocal() as db:
        current_references = db.scalars(
            select(Case.case_reference).where(
                Case.case_reference.like(f"{case_reference_prefix}%")
            )
        )
        reference_seed = max(
            (
                int(reference[len(case_reference_prefix) :])
                for reference in current_references
                if reference[len(case_reference_prefix) :].isdigit()
            ),
            default=0,
        ) + 41
        case_count_before = db.scalar(select(func.count(Case.id))) or 0
        open_cases_before = db.scalar(
            select(func.count(Case.id)).where(Case.status == CaseStatus.OPEN)
        ) or 0
        existing_lead = Lead(
            name="Existing Case Lead",
            email=f"{uuid4().hex}@example.com",
            phone="+971500000000",
            service="Home Financing",
            message="Existing case reference seed.",
            status=LeadStatus.CONVERTED,
        )
        db.add(existing_lead)
        db.flush()
        db.add(
            Case(
                lead_id=existing_lead.id,
                case_reference=f"{case_reference_prefix}{reference_seed:05d}",
                status=CaseStatus.OPEN,
            )
        )
        db.commit()
        lead_ids.append(existing_lead.id)

    admin_client = login_as(admin)
    consultant_client = login_as(consultant)

    try:
        assert client.get("/api/admin/cases/summary").status_code == 401
        assert (
            client.get(
                f"/api/admin/cases/by-lead/{contacted_lead.id}"
            ).status_code
            == 401
        )
        assert consultant_client.get("/api/admin/cases/summary").status_code == 403
        assert (
            consultant_client.get(
                f"/api/admin/cases/by-lead/{contacted_lead.id}"
            ).status_code
            == 403
        )
        assert (
            consultant_client.post(
                "/api/admin/cases",
                json={"lead_id": contacted_lead.id},
            ).status_code
            == 403
        )

        summary_response = admin_client.get("/api/admin/cases/summary")
        assert summary_response.status_code == 200
        initial_summary = summary_response.json()
        assert initial_summary["total_cases"] == case_count_before + 1
        assert initial_summary["cases_by_status"]["OPEN"] == open_cases_before + 1
        assert set(initial_summary["cases_by_status"]) == {
            "OPEN",
            "DOCUMENTS_PENDING",
            "DOCUMENTS_RECEIVED",
            "UNDER_REVIEW",
            "SUBMITTED",
            "APPROVED",
            "COMPLETED",
            "CANCELLED",
        }
        assert "notes" not in summary_response.json()

        ineligible_response = admin_client.post(
            "/api/admin/cases",
            json={"lead_id": new_lead.id},
        )
        assert ineligible_response.status_code == 400
        with SessionLocal() as db:
            assert db.get(Lead, new_lead.id).status == LeadStatus.NEW
            assert (
                db.scalar(select(Case).where(Case.lead_id == new_lead.id))
                is None
            )

        create_response = admin_client.post(
            "/api/admin/cases",
            json={"lead_id": contacted_lead.id},
        )
        assert create_response.status_code == 201
        created_case = create_response.json()
        assert created_case["lead_name"] == contacted_lead.name
        assert created_case["case_reference"] == (
            f"{case_reference_prefix}{reference_seed + 1:05d}"
        )
        with SessionLocal() as db:
            assert db.get(Lead, contacted_lead.id).status == LeadStatus.CONVERTED

        duplicate_response = admin_client.post(
            "/api/admin/cases",
            json={"lead_id": contacted_lead.id},
        )
        assert duplicate_response.status_code == 409

        detail_response = admin_client.get(
            f"/api/admin/cases/{created_case['id']}"
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["lead_name"] == contacted_lead.name
        assert detail_response.json()["lead_id"] == contacted_lead.id

        lead_case_response = admin_client.get(
            f"/api/admin/cases/by-lead/{contacted_lead.id}"
        )
        assert lead_case_response.status_code == 200
        assert lead_case_response.json()["id"] == created_case["id"]

        updated_summary = admin_client.get("/api/admin/cases/summary").json()
        assert updated_summary["total_cases"] == case_count_before + 2

    finally:
        admin_client.post("/api/auth/logout")
        consultant_client.post("/api/auth/logout")
        remove_records([admin.id, consultant.id], lead_ids)


def test_case_reference_lock_is_transaction_scoped_on_postgresql():
    class PostgreSQLBind:
        class dialect:
            name = "postgresql"

    class FakeSession:
        def __init__(self):
            self.calls = []

        def get_bind(self):
            return PostgreSQLBind()

        def execute(self, statement, parameters):
            self.calls.append((str(statement), parameters))

    db = FakeSession()
    lock_case_reference_generation(db)

    assert len(db.calls) == 1
    statement, parameters = db.calls[0]
    assert "pg_advisory_xact_lock" in statement
    assert parameters == {"lock_key": 461202601}


def test_failed_case_commit_rolls_back_case_and_lead_conversion(monkeypatch):
    admin = create_user(is_admin=True)
    contacted_lead = create_lead(LeadStatus.CONTACTED)
    admin_client = login_as(admin)

    def failing_database():
        with SessionLocal() as db:
            def fail_commit():
                raise RuntimeError("test failure")

            monkeypatch.setattr(
                db,
                "commit",
                fail_commit,
            )
            yield db

    app.dependency_overrides[get_db] = failing_database
    try:
        response = admin_client.post(
            "/api/admin/cases",
            json={"lead_id": contacted_lead.id},
        )
        assert response.status_code == 503
        with SessionLocal() as db:
            assert db.get(Lead, contacted_lead.id).status == LeadStatus.CONTACTED
            assert (
                db.scalar(
                    select(Case).where(Case.lead_id == contacted_lead.id)
                )
                is None
            )
    finally:
        app.dependency_overrides.pop(get_db, None)
        admin_client.post("/api/auth/logout")
        remove_records([admin.id], [contacted_lead.id])
