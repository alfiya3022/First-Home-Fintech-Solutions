import os
import resend


RESEND_API_KEY = os.getenv("RESEND_API_KEY")


def send_contact_enquiry(
    name: str,
    email: str,
    phone: str,
    service: str,
    message: str,
) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured.")

    resend.api_key = RESEND_API_KEY

    resend.Emails.send(
        {
            "from": "onboarding@resend.dev",
            "to": ["delivered@resend.dev"],
            "subject": f"New Mortgage Enquiry — {service}",
            "html": f"""
                <h2>New Mortgage Enquiry</h2>

                <p><strong>Name:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone}</p>
                <p><strong>Service:</strong> {service}</p>

                <p><strong>Message:</strong></p>
                <p>{message}</p>
            """,
        }
    )