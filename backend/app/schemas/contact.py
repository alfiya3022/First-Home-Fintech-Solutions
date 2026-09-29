from pydantic import BaseModel, EmailStr, Field


SERVICE_OPTIONS = [
    "Home Financing",
    "Mortgage Refinancing / Buyout",
    "Equity Release",
    "Non-Resident Mortgages",
    "Commercial Mortgages",
    "Off-Plan Property Financing",
    "Ready Property Financing",
    "UAE Resident Mortgages",
    "First-Time Home Buyers",
    "Property Investors",
    "Self-Employed Mortgage Solutions",
    "Islamic / Sharia-Compliant Financing",
]


class ContactRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    phone: str = Field(
        min_length=7,
        max_length=30,
    )

    service: str = Field(
        min_length=2,
        max_length=100,
    )

    message: str = Field(
        min_length=10,
        max_length=2000,
    )