from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.leads import Lead
from app.models.users import User
from app.schemas.leads import (
    LeadListResponse,
    LeadResponse,
    LeadStatusUpdate,
)
from app.services.excel_service import generate_leads_excel


router = APIRouter(
    prefix="/api/admin/leads",
    tags=["Admin Leads"],
)


@router.get(
    "",
    response_model=LeadListResponse,
)
def get_leads(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    leads = db.scalars(
        select(Lead).order_by(Lead.created_at.desc())
    ).all()

    return {"leads": leads}


@router.get("/export")
def export_leads_excel(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    leads = db.scalars(
        select(Lead).order_by(Lead.created_at.desc())
    ).all()

    excel_file = generate_leads_excel(leads)

    return StreamingResponse(
        excel_file,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                'attachment; filename="First Home Leads.xlsx"'
            )
        },
    )


@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lead = db.scalar(
        select(Lead).where(Lead.id == lead_id)
    )

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    return lead


@router.patch(
    "/{lead_id}/status",
    response_model=LeadResponse,
)
def update_lead_status(
    lead_id: int,
    request: LeadStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lead = db.scalar(
        select(Lead).where(Lead.id == lead_id)
    )

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    lead.status = request.status

    db.commit()
    db.refresh(lead)

    return lead