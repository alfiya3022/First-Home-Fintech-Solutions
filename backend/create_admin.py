import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.models.users import User
from database import SessionLocal


def main() -> None:
    email = input("Consultant email: ").strip().lower()
    full_name = input("Consultant full name: ").strip()
    password = getpass.getpass("Consultant password: ")

    if not email or not full_name or not password:
        raise ValueError("Email, full name, and password are required.")

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            raise ValueError("A user with this email already exists.")

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            is_active=True,
        )

        db.add(user)
        db.commit()

        print(f"Consultant account created: {user.email}")


if __name__ == "__main__":
    main()