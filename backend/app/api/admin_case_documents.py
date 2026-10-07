from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import SessionLocal
from app.models.case_documents import CaseDocument, CaseDocumentStatus
from app.models.cases import Case
from app.schemas.case_documents import (
    CaseDocumentListResponse,
    CaseDocumentResponse,
    CaseDocumentStatusUpdate,
)
from app.api.auth import get_current_user


router = APIRouter(
    prefix="/api/admin/cases",
    tags=["Admin Case Documents"],
)


DEFAULT_DOCUMENTS = [
    "Emirates ID",
    "Passport",
    "Salary Certificate",
    "Bank Statement",
    "Property Documents",
]


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get(
    "/{case_id}/documents",
    response_model=CaseDocumentListResponse,
)
def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    documents = (
        db.query(CaseDocument)
        .filter(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.id)
        .all()
    )

    if not documents:
        documents = [
            CaseDocument(
                case_id=case_id,
                document_type=document_type,
                status=CaseDocumentStatus.PENDING,
            )
            for document_type in DEFAULT_DOCUMENTS
        ]

        db.add_all(documents)
        db.commit()

        for document in documents:
            db.refresh(document)

    return {
        "documents": documents,
    }


@router.patch(
    "/{case_id}/documents/{document_id}/status",
    response_model=CaseDocumentResponse,
)
def update_case_document_status(
    case_id: int,
    document_id: int,
    payload: CaseDocumentStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    document = db.get(CaseDocument, document_id)

    if document is None or document.case_id != case_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    document.status = payload.status

    if payload.status == CaseDocumentStatus.RECEIVED:
        document.received_at = datetime.utcnow()
    else:
        document.received_at = None

    db.commit()
    db.refresh(document)

    return document