from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.cases import Case, CaseStatus
from app.models.leads import Lead, LeadStatus
from app.models.users import User
from app.schemas.cases import (
    CaseCreateRequest,
    CaseDashboardSummary,
    CaseNotesUpdate,
    CaseResponse,
    CaseListResponse,
    CaseStatusUpdate,
)


CASE_REFERENCE_LOCK_KEY = 461202601


router = APIRouter(
    prefix="/api/admin/cases",
    tags=["Admin Cases"],
)


def lock_case_reference_generation(db: Session) -> None:
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            text("SELECT pg_advisory_xact_lock(:lock_key)"),
            {"lock_key": CASE_REFERENCE_LOCK_KEY},
        )


def generate_case_reference(db: Session) -> str:
    prefix = f"FH-{datetime.now().year}-"
    references = db.scalars(
        select(Case.case_reference).where(Case.case_reference.like(f"{prefix}%"))
    )
    next_number = max(
        (
            int(reference[len(prefix) :])
            for reference in references
            if reference.startswith(prefix)
            and reference[len(prefix) :].isdigit()
        ),
        default=0,
    ) + 1

    return f"{prefix}{next_number:05d}"


def serialize_case(case: Case, lead_name: str | None) -> dict:
    return {
        "id": case.id,
        "lead_id": case.lead_id,
        "lead_name": lead_name,
        "case_reference": case.case_reference,
        "status": case.status,
        "property_type": case.property_type,
        "property_value": case.property_value,
        "loan_amount": case.loan_amount,
        "notes": case.notes,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


@router.get(
    "/summary",
    response_model=CaseDashboardSummary,
)
def get_case_summary(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    counts = dict(
        db.execute(
            select(Case.status, func.count(Case.id)).group_by(Case.status)
        ).all()
    )
    cases_by_status = {
        case_status: counts.get(case_status, 0)
        for case_status in CaseStatus
    }

    return {
        "total_cases": sum(cases_by_status.values()),
        "cases_by_status": cases_by_status,
    }


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_case(
    request: CaseCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        lock_case_reference_generation(db)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="We couldn't create the case right now. Please try again later.",
        )

    lead = db.get(Lead, request.lead_id)

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found.",
        )

    # A lead can have only one case.
    existing_case = db.scalar(
        select(Case).where(Case.lead_id == request.lead_id)
    )

    if existing_case is not None:
        raise HTTPException(
            status_code=409,
            detail="A case already exists for this lead.",
        )

    # A case can only be created after the lead has been contacted.
    if lead.status != LeadStatus.CONTACTED:
        raise HTTPException(
            status_code=400,
            detail="A case can only be created for a contacted lead.",
        )

    case = Case(
        lead_id=request.lead_id,
        case_reference=generate_case_reference(db),
        status=CaseStatus.OPEN,
        property_type=request.property_type,
        property_value=request.property_value,
        loan_amount=request.loan_amount,
        notes=request.notes,
    )

    try:
        db.add(case)

        # Creating a case converts the lead.
        lead.status = LeadStatus.CONVERTED

        db.commit()
        db.refresh(case)

    except IntegrityError:
        db.rollback()

        if db.scalar(
            select(Case).where(Case.lead_id == request.lead_id)
        ) is not None:
            raise HTTPException(
                status_code=409,
                detail="A case already exists for this lead.",
            )

        raise HTTPException(
            status_code=503,
            detail="We couldn't create the case right now. Please try again later.",
        )
    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail="We couldn't create the case right now. Please try again later.",
        )

    return serialize_case(case, lead.name)


@router.get(
    "",
    response_model=CaseListResponse,
)
def get_cases(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Case, Lead.name)
        .join(Lead, Lead.id == Case.lead_id)
        .order_by(Case.created_at.desc())
    ).all()

    return {
        "cases": [
            serialize_case(case, lead_name)
            for case, lead_name in rows
        ],
    }


@router.get(
    "/by-lead/{lead_id}",
    response_model=CaseResponse,
)
def get_case_for_lead(
    lead_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(Case, Lead.name)
        .join(Lead, Lead.id == Case.lead_id)
        .where(Case.lead_id == lead_id)
    ).one_or_none()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found for this lead.",
        )

    return serialize_case(*row)


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
)
def get_case(
    case_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(Case, Lead.name)
        .join(Lead, Lead.id == Case.lead_id)
        .where(Case.id == case_id)
    ).one_or_none()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    return serialize_case(*row)


@router.patch(
    "/{case_id}/status",
    response_model=CaseResponse,
)
def update_case_status(
    case_id: int,
    request: CaseStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    case.status = request.status

    try:
        db.commit()
        db.refresh(case)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail="We couldn't update the case status right now. Please try again later.",
        )

    lead_name = db.scalar(select(Lead.name).where(Lead.id == case.lead_id))
    return serialize_case(case, lead_name)

@router.patch("/{case_id}/notes", response_model=CaseResponse)
def update_case_notes(
    case_id: int,
    payload: CaseNotesUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    case.notes = payload.notes.strip()

    db.commit()
    db.refresh(case)

    lead_name = db.scalar(select(Lead.name).where(Lead.id == case.lead_id))
    return serialize_case(case, lead_name)