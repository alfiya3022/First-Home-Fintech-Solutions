from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.leads import Lead
from app.schemas.contact import (
    ContactRequest,
    ContactResponse,
    SERVICE_OPTIONS,
)


router = APIRouter(prefix="/api", tags=["Contact"])


@router.post(
    "/contact",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_contact_enquiry(
    request: ContactRequest,
    db: Session = Depends(get_db),
):
    if request.service not in SERVICE_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid service selected.",
        )

    lead = Lead(
        name=request.name,
        email=request.email,
        phone=request.phone,
        service=request.service,
        message=request.message,
    )

    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't submit your enquiry right now. Please try again later.",
        )

    return {
        "success": True,
        "message": "Your enquiry has been submitted successfully.",
        "lead_id": lead.id,
        "status": lead.status.value,
    }