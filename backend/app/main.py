from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

from app.api.contact import router as contact_router


app = FastAPI(
    title="First Home Fintech Solutions API",
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(contact_router)