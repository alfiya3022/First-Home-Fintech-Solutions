
from sqlalchemy import select

from database import SessionLocal
from app.models.users import User


def main() -> None:
    email = input("Existing account email to promote: ").strip().lower()

    if not email:
        raise ValueError("Email is required.")

    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == email)
        )

        if user is None:
            raise ValueError("No account exists with that email.")

        if not user.is_active:
            raise ValueError("Cannot promote an inactive account.")

        if user.is_admin:
            print("This account is already an administrator.")
            return

        confirmation = input(
            f"Grant administrator access to {user.email}? "
            "Type PROMOTE to confirm: "
        ).strip()

        if confirmation != "PROMOTE":
            print("Promotion cancelled.")
            return

        user.is_admin = True
        db.commit()

        print(f"Administrator access granted to {user.email}.")


if __name__ == "__main__":
    main()
