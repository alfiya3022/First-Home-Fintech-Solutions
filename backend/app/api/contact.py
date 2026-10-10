
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.leads import Lead
from app.schemas.contact import (
    ContactRequest,
    ContactResponse,
    SERVICE_OPTIONS,
)
from app.services.email_service import send_lead_notification


logger = logging.getLogger(__name__)

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
    # Honeypot: genuine visitors should leave this hidden field empty.
    # Silently discard bot submissions without saving a lead or sending email.
    if request.website.strip():
        logger.warning("Contact submission rejected by honeypot.")
        return {
            "success": True,
            "message": "Your enquiry has been submitted successfully.",
            "lead_id": 0,
            "status": "REJECTED",
        }

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

    try:
        send_lead_notification(
            lead_name=lead.name,
            lead_email=lead.email,
            lead_phone=lead.phone,
            lead_service=lead.service,
            lead_message=lead.message,
        )

    except Exception:
        logger.exception(
            "Failed to send Graph email notification for lead %s",
            lead.id,
        )

    return {
        "success": True,
        "message": "Your enquiry has been submitted successfully.",
        "lead_id": lead.id,
        "status": lead.status.value,
    }
