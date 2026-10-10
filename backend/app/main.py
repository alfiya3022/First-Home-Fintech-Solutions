
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.contact import router as contact_router
from app.api.auth import router as auth_router
from app.api.admin_leads import router as admin_leads_router
from app.api.admin_cases import router as admin_cases_router
from app.api.admin_case_documents import router as admin_case_documents_router
from app.api.public_map import router as public_map_router


app = FastAPI(title="First Home Fintech Solutions API")



ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

if ENVIRONMENT == "production":
    ALLOWED_ORIGINS = [
        "https://firsthomefintech.ae",
        "https://www.firsthomefintech.ae",
    ]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
    ]



app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PATCH",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
    ],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(contact_router)
app.include_router(auth_router)
app.include_router(admin_leads_router)
app.include_router(admin_cases_router)
app.include_router(admin_case_documents_router)
app.include_router(public_map_router)
