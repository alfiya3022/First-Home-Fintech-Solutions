
import os

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.security import verify_password
from app.models.sessions import Session as UserSession
from app.models.users import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.session_service import create_session


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT == "production"

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(User.email == request.email)
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    session = create_session(db, user.id)

    response.set_cookie(
        key="session_id",
        value=session.id,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=60 * 60,
        path="/",
    )

    return {
        "success": True,
        "message": "Login successful.",
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": current_user.is_admin,
    }


@router.post("/logout", response_model=LoginResponse)
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if session_id:
        session = db.scalar(
            select(UserSession).where(UserSession.id == session_id)
        )

        if session:
            db.delete(session)
            db.commit()

    response.delete_cookie(
        key="session_id",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",
    )

    return {
        "success": True,
        "message": "Logout successful.",
    }
