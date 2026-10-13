import re

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from pydantic import EmailStr, TypeAdapter


password_hasher = PasswordHasher()
EMAIL_ADAPTER = TypeAdapter(EmailStr)
CONTROL_CHARACTERS = {chr(i) for i in range(32)} | {chr(127)}


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def normalize_email(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        raise ValueError("Email address is required.")

    validated = EMAIL_ADAPTER.validate_python(candidate)
    return str(validated).strip()


def sanitize_text(
    value: str,
    *,
    field_name: str,
    max_length: int,
    allow_newlines: bool = False,
    required: bool = True,
) -> str:
    if value is None:
        if required:
            raise ValueError(f"{field_name} is required.")
        return ""

    text = str(value).strip()
    text = text.replace("\u200b", "")
    text = "".join(
        ch for ch in text if ch not in CONTROL_CHARACTERS or (allow_newlines and ch in {"\n", "\r", "\t"})
    )
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)

    if required and not text:
        raise ValueError(f"{field_name} is required.")

    if len(text) > max_length:
        text = text[:max_length].rstrip()

    if required and not text:
        raise ValueError(f"{field_name} is required.")

    return text


def normalize_phone_number(value: str) -> str:
    phone = sanitize_text(value, field_name="Phone", max_length=30)
    return re.sub(r"\s+", "", phone)
