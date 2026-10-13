#!/usr/bin/env python3
"""Safely download and restore an encrypted First Home PostgreSQL backup."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote, urlparse

import msal
import requests


GRAPH = "https://graph.microsoft.com/v1.0"
GRAPH_HOST = "graph.microsoft.com"
TIMEOUT = (15, 60)
CHUNK_SIZE = 1024 * 1024

BACKUP_NAME_PATTERN = re.compile(
    r"^firsthome-db-(\d{8}T\d{6}Z)\.dump\.gpg$"
)

PASSPHRASE_FILE = Path(
    os.environ.get(
        "BACKUP_PASSPHRASE_FILE",
        "/run/secrets/backup_encryption_passphrase",
    )
)

ARTIFACT_DIRECTORY = Path(
    os.environ.get("RECOVERY_ARTIFACT_DIRECTORY", "/recovery")
)

TEMP_DIRECTORY = Path(
    os.environ.get("RECOVERY_TEMP_DIRECTORY", "/recovery-tmp")
)

RESTORE_DATABASE = "first_home_restore"
RESTORE_USER = "firsthome_restore"
RESTORE_HOST = "recovery-db"


class RecoveryError(RuntimeError):
    """Raised when a recovery operation cannot safely continue."""


def validate_backup_name(filename: str) -> None:
    """Accept only filenames produced by the expected backup naming scheme."""
    if not BACKUP_NAME_PATTERN.fullmatch(filename):
        raise ValueError(
            "Invalid backup filename. Expected "
            "'firsthome-db-YYYYMMDDTHHMMSSZ.dump.gpg'."
        )


def validate_graph_url(url: str) -> None:
    """Prevent bearer-token requests from being sent to an unexpected host."""
    parsed = urlparse(url)

    if (
        parsed.scheme != "https"
        or parsed.hostname != GRAPH_HOST
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise RecoveryError(
            "Rejected an unexpected Microsoft Graph URL."
        )


def graph_client() -> tuple[str, dict[str, str]]:
    """Obtain an application token for Microsoft Graph."""
    tenant_id = os.environ.get("GRAPH_TENANT_ID")
    client_id = os.environ.get("GRAPH_CLIENT_ID")
    client_secret = os.environ.get("GRAPH_CLIENT_SECRET")

    if not tenant_id or not client_id or not client_secret:
        raise RecoveryError(
            "Microsoft Graph credentials are not configured."
        )

    authority = (
        f"https://login.microsoftonline.com/{tenant_id}"
    )

    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        authority=authority,
        client_credential=client_secret,
    )

    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )

    token = result.get("access_token")

    if not token:
        # Do not print tokens, secrets, or the complete authentication result.
        error_code = result.get("error", "unknown_error")
        raise RecoveryError(
            f"Microsoft Graph authentication failed ({error_code})."
        )

    return token, {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def graph_get(
    url: str,
    headers: dict[str, str],
) -> dict:
    """GET a Microsoft Graph JSON endpoint without unsafe host redirects."""
    validate_graph_url(url)

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        try:
            if response.status_code in (301, 302, 303, 307, 308):
                raise RecoveryError(
                    "Unexpected redirect from a Microsoft Graph API "
                    "request."
                )

            response.raise_for_status()

            try:
                return response.json()
            except ValueError as exc:
                raise RecoveryError(
                    "Microsoft Graph returned invalid JSON."
                ) from exc
        finally:
            response.close()

    except requests.RequestException as exc:
        raise RecoveryError(
            "Microsoft Graph request failed."
        ) from exc


def selected_drive_item(
    token: str,
    filename: str,
) -> dict:
    """Find exactly one matching encrypted backup in the configured folder."""
    user = os.environ.get("ONEDRIVE_USER")
    folder = os.environ.get(
        "ONEDRIVE_FOLDER",
        "FirstHome-Encrypted-Backups",
    )

    if not user or not folder:
        raise RecoveryError(
            "OneDrive user or backup folder is not configured."
        )

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    encoded_user = quote(user, safe="")
    encoded_folder = quote(folder, safe="")

    folder_url = (
        f"{GRAPH}/users/{encoded_user}/drive/root:/{encoded_folder}"
    )

    folder_item = graph_get(folder_url, headers)
    folder_id = folder_item.get("id")

    if not folder_id:
        raise RecoveryError(
            "The configured OneDrive backup folder has no item ID."
        )

    encoded_folder_id = quote(folder_id, safe="")
    next_url = (
        f"{GRAPH}/users/{encoded_user}/drive/items/"
        f"{encoded_folder_id}/children"
    )

    matches: list[dict] = []

    while next_url:
        page = graph_get(next_url, headers)

        for item in page.get("value", []):
            if (
                item.get("name") == filename
                and isinstance(item.get("file"), dict)
                and item.get("id")
            ):
                matches.append(item)

        next_url = page.get("@odata.nextLink")

        if next_url:
            validate_graph_url(next_url)

    if len(matches) != 1:
        raise RecoveryError(
            "Expected exactly one matching backup file in OneDrive; "
            f"found {len(matches)}."
        )

    return matches[0]


def download_backup(filename: str) -> Path:
    """Download one encrypted backup without forwarding the Graph token."""
    validate_backup_name(filename)

    if ARTIFACT_DIRECTORY.is_symlink():
        raise RecoveryError(
            "The recovery artifact directory must not be a symlink."
        )

    ARTIFACT_DIRECTORY.mkdir(
        mode=0o700,
        parents=True,
        exist_ok=True,
    )
    ARTIFACT_DIRECTORY.chmod(0o700)

    if (
        ARTIFACT_DIRECTORY.is_symlink()
        or not ARTIFACT_DIRECTORY.is_dir()
    ):
        raise RecoveryError(
            "The recovery artifact path is not a safe directory."
        )

    destination = ARTIFACT_DIRECTORY / filename

    if destination.exists() or destination.is_symlink():
        raise RecoveryError(
            "The destination already exists. Review it before retrying."
        )

    token, headers = graph_client()
    user = os.environ.get("ONEDRIVE_USER")

    if not user:
        raise RecoveryError("ONEDRIVE_USER is not configured.")

    item = selected_drive_item(token, filename)
    item_id = item["id"]

    encoded_user = quote(user, safe="")
    encoded_item_id = quote(item_id, safe="")

    content_url = (
        f"{GRAPH}/users/{encoded_user}/drive/items/"
        f"{encoded_item_id}/content"
    )

    validate_graph_url(content_url)

    created_destination = False
    response = None

    try:
        # Graph commonly returns a redirect to a preauthenticated download
        # URL. Do not forward the Graph bearer token to that URL.
        response = requests.get(
            content_url,
            headers=headers,
            stream=True,
            timeout=TIMEOUT,
            allow_redirects=False,
        )

        if response.status_code in (301, 302, 303, 307, 308):
            download_url = response.headers.get("Location")

            if not download_url:
                raise RecoveryError(
                    "Graph returned a redirect without a download URL."
                )

            parsed = urlparse(download_url)

            if (
                parsed.scheme != "https"
                or not parsed.hostname
                or parsed.username is not None
                or parsed.password is not None
            ):
                raise RecoveryError(
                    "Graph returned an unsafe download URL."
                )

            response.close()
            response = None

            # Intentionally omit Authorization: the download URL is
            # preauthenticated by Microsoft Graph.
            response = requests.get(
                download_url,
                stream=True,
                timeout=TIMEOUT,
                allow_redirects=True,
            )

        response.raise_for_status()

        with destination.open("xb") as output:
            created_destination = True
            destination.chmod(0o600)

            for chunk in response.iter_content(
                chunk_size=CHUNK_SIZE
            ):
                if chunk:
                    output.write(chunk)

            output.flush()
            os.fsync(output.fileno())

        if destination.stat().st_size == 0:
            raise RecoveryError(
                "The downloaded backup is empty."
            )

        print(f"Encrypted backup downloaded: {destination}")
        print(
            "The backup is still encrypted. No database was modified."
        )

        return destination

    except Exception:
        if created_destination:
            try:
                destination.unlink(missing_ok=True)
            except OSError:
                print(
                    "Warning: could not remove the incomplete download.",
                    file=sys.stderr,
                )
        raise

    finally:
        if response is not None:
            response.close()


def run_command(
    command: list[str],
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    """Run a recovery command without exposing captured output or secrets."""
    try:
        return subprocess.run(
            command,
            check=True,
            timeout=24 * 60 * 60,
            capture_output=True,
            text=True,
            env=env,
        )
    except subprocess.TimeoutExpired as exc:
        raise RecoveryError(
            f"Recovery command timed out: {command[0]}."
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise RecoveryError(
            f"Recovery command failed: {command[0]} "
            f"(exit code {exc.returncode})."
        ) from exc
    except OSError as exc:
        raise RecoveryError(
            f"Could not execute recovery command: {command[0]}."
        ) from exc


def validate_restore_environment() -> dict[str, str]:
    """Ensure the target is the disposable recovery database."""
    host = os.environ.get("PGHOST")
    database = os.environ.get("PGDATABASE")
    user = os.environ.get("PGUSER")
    password = os.environ.get("PGPASSWORD")

    if host != RESTORE_HOST:
        raise RecoveryError(
            f"Refusing restore: PGHOST must be {RESTORE_HOST!r}."
        )

    if database != RESTORE_DATABASE:
        raise RecoveryError(
            "Refusing restore: PGDATABASE is not the recovery database."
        )

    if user != RESTORE_USER:
        raise RecoveryError(
            "Refusing restore: PGUSER is not the recovery user."
        )

    if not password:
        raise RecoveryError(
            "RECOVERY_DB_PASSWORD must be set to a non-empty password."
        )

    return os.environ.copy()


def validate_source_artifact(filename: str) -> Path:
    """Validate the existing encrypted artifact without following symlinks."""
    validate_backup_name(filename)

    if (
        ARTIFACT_DIRECTORY.is_symlink()
        or not ARTIFACT_DIRECTORY.is_dir()
    ):
        raise RecoveryError(
            "The recovery artifact directory is missing or unsafe."
        )

    source = ARTIFACT_DIRECTORY / filename

    if source.is_symlink() or not source.is_file():
        raise RecoveryError(
            "The requested encrypted backup is missing or unsafe."
        )

    if source.stat().st_size == 0:
        raise RecoveryError(
            "The encrypted backup file is empty."
        )

    return source


def ensure_empty_database(
    env: dict[str, str],
) -> None:
    """Refuse to restore over existing application relations."""
    query = """
        SELECT count(*)
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN (
            'pg_catalog',
            'information_schema'
        )
        AND n.nspname NOT LIKE 'pg_toast%'
        AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');
    """

    result = run_command(
        [
            "psql",
            "--no-psqlrc",
            "--set=ON_ERROR_STOP=1",
            "--tuples-only",
            "--no-align",
            "--command",
            query,
        ],
        env=env,
    )

    if result.stdout.strip() != "0":
        raise RecoveryError(
            "The recovery database is not empty. "
            "No restore was attempted."
        )


def decrypt_and_restore(
    filename: str,
    confirmed: bool,
) -> None:
    """Decrypt a selected backup in temporary storage and restore it."""
    if not confirmed:
        raise RecoveryError(
            "Explicit confirmation of the disposable recovery target "
            "is required."
        )

    source = validate_source_artifact(filename)
    env = validate_restore_environment()

    if (
        PASSPHRASE_FILE.is_symlink()
        or not PASSPHRASE_FILE.is_file()
        or PASSPHRASE_FILE.stat().st_size == 0
    ):
        raise RecoveryError(
            "The backup encryption passphrase file is missing or unsafe."
        )

    if TEMP_DIRECTORY.is_symlink():
        raise RecoveryError(
            "The temporary recovery directory must not be a symlink."
        )

    TEMP_DIRECTORY.mkdir(
        mode=0o700,
        parents=True,
        exist_ok=True,
    )
    TEMP_DIRECTORY.chmod(0o700)

    if (
        TEMP_DIRECTORY.is_symlink()
        or not TEMP_DIRECTORY.is_dir()
    ):
        raise RecoveryError(
            "The temporary recovery directory is unsafe."
        )

    temporary_path: Path | None = None

    try:
        temporary_path = Path(
            tempfile.mkdtemp(
                prefix="firsthome-restore-",
                dir=TEMP_DIRECTORY,
            )
        )
        temporary_path.chmod(0o700)

        gpg_home = temporary_path / "gnupg"
        gpg_home.mkdir(mode=0o700)

        dump_path = temporary_path / "database.dump"

        # Decrypt only into the temporary directory, never beside the
        # encrypted artifact.
        run_command(
            [
                "gpg",
                "--batch",
                "--no-symkey-cache",
                "--pinentry-mode",
                "loopback",
                "--homedir",
                str(gpg_home),
                "--passphrase-file",
                str(PASSPHRASE_FILE),
                "--output",
                str(dump_path),
                "--decrypt",
                str(source),
            ],
            env=env,
        )

        if not dump_path.is_file() or dump_path.stat().st_size == 0:
            raise RecoveryError(
                "Decryption did not produce a valid non-empty dump."
            )

        # Validate that pg_restore can read the dump before touching the DB.
        run_command(
            [
                "pg_restore",
                "--list",
                str(dump_path),
            ],
            env=env,
        )

        ensure_empty_database(env)

        # No owner or ACL restoration: the disposable recovery user owns
        # the restored objects.
        run_command(
            [
                "pg_restore",
                "--exit-on-error",
                "--no-owner",
                "--no-acl",
                "--dbname",
                RESTORE_DATABASE,
                str(dump_path),
            ],
            env=env,
        )

        print(
            "Restore completed in the disposable recovery database "
            f"{RESTORE_DATABASE!r}."
        )
        print(
            "This script did not target the production application database."
        )

    finally:
        if temporary_path is not None:
            try:
                shutil.rmtree(temporary_path)
            except OSError as exc:
                print(
                    "CRITICAL: temporary recovery files could not be "
                    f"removed: {temporary_path}",
                    file=sys.stderr,
                )
                raise RecoveryError(
                    "Temporary plaintext cleanup failed. "
                    "Do not consider this recovery run successful."
                ) from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Download or restore an encrypted First Home PostgreSQL backup."
        )
    )

    subparsers = parser.add_subparsers(
        dest="action",
        required=True,
    )

    download_parser = subparsers.add_parser(
        "download",
        help="Download one encrypted backup from OneDrive.",
    )
    download_parser.add_argument(
        "--filename",
        required=True,
        help="Exact encrypted backup filename.",
    )

    restore_parser = subparsers.add_parser(
        "restore",
        help="Restore a downloaded backup to the disposable recovery DB.",
    )
    restore_parser.add_argument(
        "--filename",
        required=True,
        help="Exact encrypted backup filename.",
    )
    restore_parser.add_argument(
        "--confirm-disposable-target",
        action="store_true",
        help="Confirm the target is the disposable recovery database.",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.action == "download":
            download_backup(args.filename)

        elif args.action == "restore":
            decrypt_and_restore(
                args.filename,
                confirmed=args.confirm_disposable_target,
            )

        return 0

    except (
        OSError,
        ValueError,
        RecoveryError,
        requests.RequestException,
    ) as exc:
        print(
            f"Recovery stage failed: {exc}",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())