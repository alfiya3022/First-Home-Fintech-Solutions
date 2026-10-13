from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.leads import Lead
from app.models.users import User
from app.schemas.leads import (
    ConsultantLeadListResponse,
    LeadResponse,
)


router = APIRouter(
    prefix="/api/consultant/leads",
    tags=["Consultant Leads"],
)


@router.get("", response_model=ConsultantLeadListResponse)
def get_consultant_leads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = db.execute(
        select(
            Lead.id,
            Lead.name,
            Lead.email,
            Lead.phone,
            Lead.service,
            Lead.status,
            Lead.created_at,
        )
        .order_by(Lead.created_at.desc())
    ).mappings().all()

    return {"leads": [dict(lead) for lead in leads]}


@router.get("/{lead_id}", response_model=LeadResponse)
def get_consultant_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )
    return lead
