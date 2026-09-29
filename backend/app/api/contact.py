from fastapi import APIRouter, HTTPException, status

from app.schemas.contact import ContactRequest, SERVICE_OPTIONS
from app.services.email_service import send_contact_enquiry


router = APIRouter(prefix="/api", tags=["Contact"])


@router.post("/contact")
def submit_contact_enquiry(request: ContactRequest):
    if request.service not in SERVICE_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid service selected.",
        )

    try:
        send_contact_enquiry(
            name=request.name,
            email=request.email,
            phone=request.phone,
            service=request.service,
            message=request.message,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't submit your enquiry right now. Please try again later.",
        )

    return {
        "success": True,
        "message": "Your enquiry has been submitted successfully.",
    }