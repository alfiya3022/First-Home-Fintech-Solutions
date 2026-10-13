import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.models.users import User
from database import SessionLocal


def main() -> None:
    email = input("Administrator email: ").strip().lower()
    full_name = input("Administrator full name: ").strip()

    if not email or not full_name:
        raise ValueError("Email and full name are required.")

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            if existing_user.full_name != full_name:
                raise ValueError(
                    "The email belongs to an account with a different full name."
                )

            if not existing_user.is_active:
                raise ValueError(
                    "Cannot grant administrator access to an inactive account."
                )

            if existing_user.is_admin:
                print(f"Administrator account already exists: {existing_user.email}")
                return

            confirmation = input(
                f"Grant administrator access to {existing_user.email}? "
                "Type PROMOTE to confirm: "
            ).strip()
            if confirmation != "PROMOTE":
                print("Administrator promotion cancelled.")
                return

            existing_user.is_admin = True
            db.commit()
            print(f"Administrator access granted to {existing_user.email}.")
            return

        password = getpass.getpass("Administrator password: ")
        password_confirmation = getpass.getpass(
            "Confirm administrator password: "
        )

        if not password:
            raise ValueError("Administrator password is required.")
        if password != password_confirmation:
            raise ValueError("Administrator passwords do not match.")

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_admin=True,
        )
        db.add(user)
        db.commit()

        print(f"Administrator account created: {user.email}")


if __name__ == "__main__":
    main()