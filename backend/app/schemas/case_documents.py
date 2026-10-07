from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.case_documents import CaseDocumentStatus


class CaseDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    document_type: str
    status: CaseDocumentStatus
    received_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CaseDocumentListResponse(BaseModel):
    documents: list[CaseDocumentResponse]


class CaseDocumentStatusUpdate(BaseModel):
    status: CaseDocumentStatus