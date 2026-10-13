import os

from dotenv import load_dotenv
import msal
import requests

from app.core.security import normalize_email, normalize_phone_number, sanitize_text

load_dotenv()


GRAPH_SCOPE = ["https://graph.microsoft.com/.default"]
GRAPH_SEND_MAIL_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"


def send_lead_notification(
    lead_name: str,
    lead_email: str,
    lead_phone: str,
    lead_service: str,
    lead_message: str,
) -> None:
    tenant_id = os.getenv("GRAPH_TENANT_ID")
    client_id = os.getenv("GRAPH_CLIENT_ID")
    client_secret = os.getenv("GRAPH_CLIENT_SECRET")
    sender_email = os.getenv("GRAPH_SENDER_EMAIL")
    recipient_email = os.getenv("GRAPH_RECIPIENT_EMAIL")

    required_values = {
        "GRAPH_TENANT_ID": tenant_id,
        "GRAPH_CLIENT_ID": client_id,
        "GRAPH_CLIENT_SECRET": client_secret,
        "GRAPH_SENDER_EMAIL": sender_email,
        "GRAPH_RECIPIENT_EMAIL": recipient_email,
    }

    missing_values = [
        name for name, value in required_values.items() if not value
    ]

    if missing_values:
        raise RuntimeError(
            f"Missing Microsoft Graph configuration: {', '.join(missing_values)}"
        )

    try:
        safe_name = sanitize_text(
            lead_name,
            field_name="Lead name",
            max_length=100,
        )
        safe_email = normalize_email(lead_email)
        safe_phone = normalize_phone_number(lead_phone)
        safe_service = sanitize_text(
            lead_service,
            field_name="Lead service",
            max_length=100,
        )
        safe_message = sanitize_text(
            lead_message,
            field_name="Lead message",
            max_length=2000,
            allow_newlines=True,
        )
    except ValueError as exc:
        raise RuntimeError(f"Invalid lead payload: {exc}") from exc

    authority = f"https://login.microsoftonline.com/{tenant_id}"

    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        authority=authority,
        client_credential=client_secret,
    )

    token_result = app.acquire_token_for_client(
        scopes=GRAPH_SCOPE
    )

    access_token = token_result.get("access_token")

    if not access_token:
        error_description = token_result.get(
            "error_description",
            "Unable to acquire Microsoft Graph access token.",
        )

        raise RuntimeError(error_description)

    email_body = "\n".join(
        [
            f"Name: {safe_name}",
            f"Email: {safe_email}",
            f"Contact Number: {safe_phone}",
            f"Purpose of Contact: {safe_service}",
            "",
            "Message:",
            safe_message,
        ]
    )

    payload = {
        "message": {
            "subject": f"New First Home Enquiry — {safe_name[:80]}",
            "body": {
                "contentType": "Text",
                "content": email_body,
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": recipient_email,
                    }
                }
            ],
            "replyTo": [
                {
                    "emailAddress": {
                        "address": safe_email,
                    }
                }
            ],
        },
        "saveToSentItems": True,
    }

    response = requests.post(
        GRAPH_SEND_MAIL_URL.format(sender=sender_email),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    if response.status_code != 202:
        raise RuntimeError(
            f"Microsoft Graph email failed: "
            f"{response.status_code} {response.text}"
        )