import os

from dotenv import load_dotenv
import msal
import requests

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

    email_body = f"""
Name: {lead_name}
Email: {lead_email}
Contact Number: {lead_phone}
Purpose of Contact: {lead_service}

Message:
{lead_message}
""".strip()

    payload = {
        "message": {
            "subject": f"New First Home Enquiry — {lead_name}",
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
                        "address": lead_email,
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