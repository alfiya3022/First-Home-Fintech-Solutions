
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.case_documents import CaseDocumentStatus


class CaseDocumentFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_document_id: int
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class CaseDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    document_type: str
    status: CaseDocumentStatus
    received_at: datetime | None
    created_at: datetime
    updated_at: datetime
    files: list[CaseDocumentFileResponse] = Field(default_factory=list)


class CaseDocumentListResponse(BaseModel):
    documents: list[CaseDocumentResponse]


class CaseDocumentStatusUpdate(BaseModel):
    status: CaseDocumentStatus
