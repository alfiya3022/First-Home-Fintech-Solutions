
import os
from urllib.parse import quote

import msal
import requests
from fastapi import HTTPException


GRAPH_BASE = "https://graph.microsoft.com/v1.0"
SITE_ID = "80f1105d-ac85-4614-918f-eb5a0e2050b7"
LIBRARY_NAME = "Mortgage Documents"


class SharePointService:
    def __init__(self):
        tenant_id = os.getenv("GRAPH_TENANT_ID")
        client_id = os.getenv("GRAPH_CLIENT_ID")
        client_secret = os.getenv("GRAPH_CLIENT_SECRET")

        if not all((tenant_id, client_id, client_secret)):
            raise RuntimeError(
                "SharePoint Graph credentials are not configured."
            )

        app = msal.ConfidentialClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            client_credential=client_secret,
        )

        result = app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )

        access_token = result.get("access_token")
        if not access_token:
            raise RuntimeError(
                "Unable to obtain a Microsoft Graph access token."
            )

        self.headers = {"Authorization": f"Bearer {access_token}"}
        self._drive_id = None

    def drive_id(self):
        if self._drive_id:
            return self._drive_id

        response = requests.get(
            f"{GRAPH_BASE}/sites/{SITE_ID}/drives",
            headers=self.headers,
            timeout=30,
        )

        if not response.ok:
            raise RuntimeError(
                "Unable to access SharePoint libraries "
                f"(HTTP {response.status_code})."
            )

        for drive in response.json().get("value", []):
            if drive.get("name") == LIBRARY_NAME:
                self._drive_id = drive["id"]
                return self._drive_id

        raise RuntimeError(
            f"SharePoint library '{LIBRARY_NAME}' was not found."
        )

    def ensure_case_folder(self, case_id: int):
        """Find or create the folder for a case."""
        drive_id = self.drive_id()
        folder_name = f"Case-{case_id}"
        encoded_folder = quote(folder_name, safe="")

        folder_url = (
            f"{GRAPH_BASE}/drives/{drive_id}"
            f"/root:/{encoded_folder}"
        )

        response = requests.get(
            folder_url,
            headers=self.headers,
            timeout=30,
        )

        if response.ok:
            item = response.json()

            if "folder" not in item:
                raise RuntimeError(
                    f"SharePoint path '{folder_name}' is not a folder."
                )

            return item["id"]

        if response.status_code != 404:
            raise RuntimeError(
                "Unable to check the SharePoint case folder "
                f"(HTTP {response.status_code})."
            )

        create_url = (
            f"{GRAPH_BASE}/drives/{drive_id}/root/children"
        )

        payload = {
            "name": folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "fail",
        }

        response = requests.post(
            create_url,
            headers={
                **self.headers,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )

        if response.status_code == 409:
            # Another request may have created the folder concurrently.
            response = requests.get(
                folder_url,
                headers=self.headers,
                timeout=30,
            )

            if response.ok and "folder" in response.json():
                return response.json()["id"]

        if not response.ok:
            raise RuntimeError(
                "Unable to create the SharePoint case folder "
                f"(HTTP {response.status_code})."
            )

        return response.json()["id"]

    def upload(
        self,
        case_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ):
        """Upload a file into its case-specific folder."""
        drive_id = self.drive_id()
        self.ensure_case_folder(case_id)

        folder_name = quote(f"Case-{case_id}", safe="")
        encoded_filename = quote(filename, safe="")

        upload_url = (
            f"{GRAPH_BASE}/drives/{drive_id}"
            f"/root:/{folder_name}/{encoded_filename}:/content"
        )

        response = requests.put(
            upload_url,
            headers={
                **self.headers,
                "Content-Type": content_type or "application/octet-stream",
            },
            data=content,
            timeout=(15, 120),
        )

        if not response.ok:
            raise RuntimeError(
                "SharePoint upload failed "
                f"(HTTP {response.status_code})."
            )

        return response.json()

    def download(self, item_id: str):
        drive_id = self.drive_id()

        response = requests.get(
            f"{GRAPH_BASE}/drives/{drive_id}"
            f"/items/{quote(item_id, safe='')}/content",
            headers=self.headers,
            stream=True,
            allow_redirects=True,
            timeout=(15, 120),
        )

        if not response.ok:
            response.close()
            raise RuntimeError(
                "SharePoint download failed "
                f"(HTTP {response.status_code})."
            )

        return response


def get_sharepoint_service():
    try:
        return SharePointService()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc
