import os
import re
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import msal
import requests


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

GRAPH = "https://graph.microsoft.com/v1.0"
TIMEOUT = (15, 60)
CHUNK_SIZE = 10 * 1024 * 1024  # 10 MiB

BACKUP_INTERVAL_SECONDS = int(
    os.getenv("BACKUP_INTERVAL_SECONDS", "86400")
)
BACKUP_RETRY_SECONDS = int(
    os.getenv("BACKUP_RETRY_SECONDS", "900")
)
BACKUP_RETENTION_COUNT = int(
    os.getenv("BACKUP_RETENTION_COUNT", "7")
)

TENANT_ID = os.environ["GRAPH_TENANT_ID"]
CLIENT_ID = os.environ["GRAPH_CLIENT_ID"]
CLIENT_SECRET = os.environ["GRAPH_CLIENT_SECRET"]

ONEDRIVE_USER = os.environ["ONEDRIVE_USER"]
ONEDRIVE_FOLDER = os.getenv(
    "ONEDRIVE_FOLDER",
    "FirstHome-Encrypted-Backups",
)

PASSPHRASE_FILE = Path(
    os.getenv(
        "BACKUP_PASSPHRASE_FILE",
        "/run/secrets/backup_encryption_passphrase",
    )
)

NAME_PATTERN = re.compile(
    r"^firsthome-db-(\d{8}T\d{6}Z)\.dump\.gpg$"
)


# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

def log(message):
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"[{timestamp}] {message}", flush=True)


# ---------------------------------------------------------
# Microsoft Graph authentication
# ---------------------------------------------------------

def graph_token():
    authority = (
        f"https://login.microsoftonline.com/{TENANT_ID}"
    )

    app = msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=authority,
        client_credential=CLIENT_SECRET,
    )

    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )

    token = result.get("access_token")

    if not token:
        error = result.get("error", "unknown_error")
        description = result.get(
            "error_description",
            "No additional details",
        )
        raise RuntimeError(
            f"Microsoft Graph authentication failed: "
            f"{error}: {description}"
        )

    return token


# ---------------------------------------------------------
# OneDrive operations
# ---------------------------------------------------------

class OneDrive:
    def __init__(self, token):
        self.headers = {
            "Authorization": f"Bearer {token}",
        }

        encoded_user = quote(ONEDRIVE_USER, safe="@")
        self.root = (
            f"{GRAPH}/users/{encoded_user}/drive/root"
        )

        # This endpoint addresses the user's drive itself,
        # rather than the drive's root item.
        self.drive_url = self.root.rsplit("/root", 1)[0]

        self.folder = ONEDRIVE_FOLDER

    @staticmethod
    def check(response, operation):
        if response.ok:
            return

        try:
            body = response.json()
            error = body.get("error", {})
            code = error.get("code", "unknown")
            message = error.get(
                "message",
                response.text[:500],
            )
        except ValueError:
            code = "unknown"
            message = response.text[:500]

        raise RuntimeError(
            f"OneDrive {operation} failed "
            f"(HTTP {response.status_code}, "
            f"{code}): {message}"
        )

    def folder_metadata(self):
        folder_path = quote(self.folder, safe="")
        url = f"{self.root}:/{folder_path}"

        response = requests.get(
            url,
            headers=self.headers,
            timeout=TIMEOUT,
        )
        self.check(response, "backup-folder lookup")

        return response.json()

    def ensure_folder(self):
        # First check whether the folder already exists.
        folder_path = quote(self.folder, safe="")
        url = f"{self.root}:/{folder_path}"

        response = requests.get(
            url,
            headers=self.headers,
            timeout=TIMEOUT,
        )

        if response.ok:
            return response.json()

        if response.status_code != 404:
            self.check(response, "backup-folder lookup")

        # Create the folder if it does not exist.
        parent_url = f"{self.root}/children"

        response = requests.post(
            parent_url,
            headers={
                **self.headers,
                "Content-Type": "application/json",
            },
            json={
                "name": self.folder,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "fail",
            },
            timeout=TIMEOUT,
        )

        # Another process could have created it between
        # the initial lookup and this request.
        if response.status_code == 409:
            return self.folder_metadata()

        self.check(response, "backup-folder creation")
        return response.json()

    def upload(self, path, filename):
        path = Path(path)

        if not path.is_file():
            raise RuntimeError(
                f"Backup file is missing: {path}"
            )

        if path.stat().st_size == 0:
            raise RuntimeError(
                "Refusing to upload an empty backup file."
            )

        # Get the real folder item ID.
        folder = self.folder_metadata()
        folder_id = folder["id"]

        # IMPORTANT:
        # Use the drive endpoint and folder item ID.
        # The endpoint below was verified to return HTTP 200.
        encoded_name = quote(filename, safe="")

        upload_session_url = (
            f"{self.drive_url}/items/{folder_id}:/"
            f"{encoded_name}:/createUploadSession"
        )

        response = requests.post(
            upload_session_url,
            headers=self.headers,
            timeout=TIMEOUT,
        )
        self.check(response, "upload-session creation")

        session = response.json()
        upload_url = session.get("uploadUrl")

        if not upload_url:
            raise RuntimeError(
                "OneDrive did not return an upload URL."
            )

        total_size = path.stat().st_size
        uploaded_item = None

        # The upload URL is pre-authorized. Do not send the
        # Graph bearer token to it or log the URL.
        with path.open("rb") as backup_file:
            start = 0

            while start < total_size:
                chunk = backup_file.read(CHUNK_SIZE)

                if not chunk:
                    break

                end = start + len(chunk) - 1

                response = requests.put(
                    upload_url,
                    headers={
                        "Content-Length": str(len(chunk)),
                        "Content-Range": (
                            f"bytes {start}-{end}/{total_size}"
                        ),
                    },
                    data=chunk,
                    timeout=TIMEOUT,
                )

                if response.status_code in (200, 201):
                    uploaded_item = response.json()
                    start = end + 1
                    break

                if response.status_code == 202:
                    start = end + 1
                    continue

                self.check(response, "chunk upload")

        if uploaded_item is None:
            raise RuntimeError(
                "Upload ended without OneDrive confirming "
                "the completed file."
            )

        if not uploaded_item.get("id"):
            raise RuntimeError(
                "OneDrive response did not include the "
                "uploaded item's ID."
            )

        return uploaded_item

    def list_backups(self):
        folder = self.folder_metadata()
        folder_id = folder["id"]

        url = (
            f"{self.drive_url}/items/{folder_id}/children"
        )

        items = []

        while url:
            response = requests.get(
                url,
                headers=self.headers,
                timeout=TIMEOUT,
            )
            self.check(response, "backup listing")

            data = response.json()
            items.extend(data.get("value", []))
            url = data.get("@odata.nextLink")

        backups = []

        for item in items:
            name = item.get("name", "")
            match = NAME_PATTERN.fullmatch(name)

            if match and item.get("file"):
                backups.append(
                    {
                        "id": item["id"],
                        "name": name,
                        "created": match.group(1),
                        "size": item.get("size", 0),
                    }
                )

        backups.sort(
            key=lambda backup: backup["created"],
            reverse=True,
        )

        return backups

    def delete_item(self, item_id):
        url = f"{self.drive_url}/items/{item_id}"

        response = requests.delete(
            url,
            headers=self.headers,
            timeout=TIMEOUT,
        )

        if response.status_code not in (200, 202, 204):
            self.check(response, "old-backup deletion")


# ---------------------------------------------------------
# PostgreSQL dump
# ---------------------------------------------------------

def create_dump(output_path):
    database = os.getenv("POSTGRES_DB")
    username = os.getenv("POSTGRES_USER")
    host = os.getenv("PGHOST", "db")
    port = os.getenv("PGPORT", "5432")
    password = os.getenv("POSTGRES_PASSWORD")

    if not database or not username or not password:
        raise RuntimeError(
            "POSTGRES_DB, POSTGRES_USER, and "
            "POSTGRES_PASSWORD must be configured."
        )

    command = [
        "pg_dump",
        "--host", host,
        "--port", port,
        "--username", username,
        "--dbname", database,
        "--format=custom",
        "--no-owner",
        "--no-acl",
        "--file", str(output_path),
    ]

    # Pass the password to pg_dump without exposing it
    # in command-line arguments.
    env = os.environ.copy()
    env["PGPASSWORD"] = password

    subprocess.run(
        command,
        check=True,
        timeout=3600,
        capture_output=True,
        text=True,
        env=env,
    )

    if not output_path.is_file() or output_path.stat().st_size == 0:
        raise RuntimeError(
            "pg_dump failed to create a valid database dump."
        )


# ---------------------------------------------------------
# Backup encryption
# ---------------------------------------------------------

def encrypt_dump(dump_path, encrypted_path):
    if not PASSPHRASE_FILE.is_file():
        raise RuntimeError(
            "Backup encryption passphrase file is missing."
        )

    if PASSPHRASE_FILE.stat().st_size == 0:
        raise RuntimeError(
            "Backup encryption passphrase file is empty."
        )

    command = [
        "gpg",
        "--batch",
        "--yes",
        "--no-symkey-cache",
        "--pinentry-mode", "loopback",
        "--cipher-algo", "AES256",
        "--symmetric",
        "--passphrase-file", str(PASSPHRASE_FILE),
        "--output", str(encrypted_path),
        str(dump_path),
    ]

    subprocess.run(
        command,
        check=True,
        timeout=3600,
        capture_output=True,
        text=True,
    )

    if not encrypted_path.is_file():
        raise RuntimeError(
            "GPG completed without creating an encrypted file."
        )

    if encrypted_path.stat().st_size == 0:
        raise RuntimeError(
            "GPG created an empty encrypted file."
        )


# ---------------------------------------------------------
# Retention policy
# ---------------------------------------------------------

def apply_retention(onedrive):
    backups = onedrive.list_backups()

    if not backups:
        log("No existing backups found for retention.")
        return

    # Keep the newest configured number of backups.
    keep_ids = {
        backup["id"]
        for backup in backups[:BACKUP_RETENTION_COUNT]
    }

    # Also keep the newest backup from each of the latest
    # four distinct ISO weeks.
    seen_weeks = set()
    weeks_kept = 0

    for backup in backups:
        created = datetime.strptime(
            backup["created"],
            "%Y%m%dT%H%M%SZ",
        ).replace(tzinfo=timezone.utc)

        iso_year, iso_week, _ = created.isocalendar()
        week_key = (iso_year, iso_week)

        if week_key in seen_weeks:
            continue

        seen_weeks.add(week_key)

        if weeks_kept < 4:
            keep_ids.add(backup["id"])
            weeks_kept += 1

    deleted = 0

    for backup in backups:
        if backup["id"] in keep_ids:
            continue

        onedrive.delete_item(backup["id"])
        deleted += 1
        log(f"Deleted expired backup: {backup['name']}")

    log(
        f"Retention complete. Found {len(backups)} backups; "
        f"deleted {deleted}; retained "
        f"{len(backups) - deleted}."
    )


# ---------------------------------------------------------
# Complete backup workflow
# ---------------------------------------------------------

def run_backup():
    timestamp = datetime.now(timezone.utc).strftime(
        "%Y%m%dT%H%M%SZ"
    )

    filename = f"firsthome-db-{timestamp}.dump.gpg"

    with tempfile.TemporaryDirectory(
        prefix="firsthome-backup-"
    ) as temporary_directory:
        temp_dir = Path(temporary_directory)

        dump_path = temp_dir / f"firsthome-db-{timestamp}.dump"
        encrypted_path = temp_dir / filename

        log("Starting PostgreSQL backup.")
        create_dump(dump_path)
        log(
            f"Database dump created "
            f"({dump_path.stat().st_size} bytes)."
        )

        encrypt_dump(dump_path, encrypted_path)
        log(
            f"Encrypted backup created "
            f"({encrypted_path.stat().st_size} bytes)."
        )

        token = graph_token()
        onedrive = OneDrive(token)

        onedrive.ensure_folder()

        uploaded = onedrive.upload(
            encrypted_path,
            filename,
        )

        log(
            f"Encrypted backup uploaded successfully: "
            f"{uploaded.get('name', filename)}"
        )

        # Verify that the uploaded backup appears in the
        # remote folder before applying retention.
        backups = onedrive.list_backups()

        if not any(
            backup["id"] == uploaded["id"]
            for backup in backups
        ):
            raise RuntimeError(
                "Upload returned successfully, but the backup "
                "could not be found in the remote folder."
            )

        log("Remote backup listing verification succeeded.")

        apply_retention(onedrive)

        log("Backup workflow completed successfully.")


# ---------------------------------------------------------
# Main loop
# ---------------------------------------------------------

def main():
    log("First Home encrypted backup process started.")

    while True:
        try:
            run_backup()

            log(
                f"Next backup attempt in "
                f"{BACKUP_INTERVAL_SECONDS} seconds."
            )
            time.sleep(BACKUP_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            log("Backup process stopped.")
            break

        except Exception as exc:
            log(
                f"BACKUP FAILED: {type(exc).__name__}: {exc}"
            )
            log(
                f"Retrying in {BACKUP_RETRY_SECONDS} seconds."
            )
            time.sleep(BACKUP_RETRY_SECONDS)


if __name__ == "__main__":
    main()