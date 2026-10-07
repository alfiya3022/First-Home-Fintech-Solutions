from datetime import datetime

from pydantic import BaseModel

from app.models.leads import LeadStatus


class LeadResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    service: str
    message: str
    status: LeadStatus
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    leads: list[LeadResponse]


class LeadStatusUpdate(BaseModel):
    status: LeadStatus