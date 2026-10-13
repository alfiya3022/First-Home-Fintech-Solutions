from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.cases import CaseStatus


class CaseCreateRequest(BaseModel):
    lead_id: int = Field(gt=0)

    property_type: str | None = Field(
        default=None,
        max_length=100,
    )

    property_value: Decimal | None = Field(
        default=None,
        gt=0,
    )

    loan_amount: Decimal | None = Field(
        default=None,
        gt=0,
    )

    notes: str | None = None


class CaseStatusUpdate(BaseModel):
    status: CaseStatus


class CaseNotesUpdate(BaseModel):
    notes: str


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    lead_name: str | None = None
    case_reference: str
    status: CaseStatus
    property_type: str | None
    property_value: Decimal | None
    loan_amount: Decimal | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]


class CaseDashboardSummary(BaseModel):
    total_cases: int
    cases_by_status: dict[CaseStatus, int]