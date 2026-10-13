# First Home Fintech Solutions

First Home V2 is a consultant-facing UAE mortgage-financing website and case
management application. It includes a React frontend, a FastAPI backend,
PostgreSQL persistence, session-based authentication, lead and case
management, SharePoint document integration, and asynchronous Microsoft Graph
notifications.

The repository is not currently approved for public production deployment.
Nginx is configured for host-managed Let's Encrypt certificates, HTTPS on port
443, and HTTP-to-HTTPS redirection, but no production certificate has been
provisioned or deployed. Live cloud integrations, PostgreSQL release
verification, backup restoration, and production operations have not been
demonstrated. Do not treat successful unit tests or a frontend build as launch
approval.

## Architecture

```text
Browser
  └── Nginx (TLS termination; requires host-managed certificate files)
       ├── React/Vite frontend
       └── /api/* → FastAPI
                    └── PostgreSQL

FastAPI → PostgreSQL notification outbox → notification worker → Microsoft Graph
FastAPI → SharePoint document storage
Backup service → encrypted PostgreSQL dump → OneDrive
```

The current Docker Compose stack includes a notification worker and a backup
service. The worker can send Graph notifications; the backup service can
upload encrypted database backups and apply remote retention. Do not start
these services against real credentials or data until the integration and
operational behavior has been explicitly approved and tested in a dedicated
environment.

Database backups do not contain SharePoint document binaries. A database
restore alone therefore does not recover uploaded documents.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Python, FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL
- Authentication: server-side sessions and Argon2 password hashing
- Integrations: Microsoft Graph, SharePoint, OneDrive
- Operations: Docker Compose, Nginx, GitHub Actions

## Local development

### Frontend

From `frontend/`:

```powershell
npm ci
npm run lint
npm run build
```

The frontend API client adds `/api/...` to `VITE_API_BASE_URL`. The Dockerfile default and Docker Compose build argument
are both empty so requests use exactly one
`/api/...` prefix and Nginx can proxy them to the backend. `npm test` includes
a regression check for this Docker/API routing contract.

### Backend

From `backend/`, create and activate a virtual environment, then install the
development requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

Configure a local PostgreSQL database and the required environment variables
using a private environment file or secret manager. Do not commit populated
environment files or put credentials in command history. See
[`backend/.env.example`](backend/.env.example) for the variable names.

Run the API from `backend/`:

```powershell
python -m uvicorn app.main:app --reload
```

The API exposes `/health` as a liveness check and `/ready` as a database
connectivity check. `/ready` does not verify Alembic revision state.

### EIBOR rates

The homepage reads EIBOR rates from `GET /api/eibor` and refreshes its display
automatically every five minutes. The worker checks the official CBUAE EIBOR
endpoint on startup and every 24 hours. The last attempt and successful fetch,
verified publication date, last rate change, source status, and a sanitized
error code are persisted in PostgreSQL. The protected
`GET /api/admin/eibor/monitoring` endpoint exposes those monitoring details to
administrators. A PostgreSQL advisory lock and persisted attempt time prevent
overlapping or duplicate daily checks across worker instances.

PostgreSQL rate values are changed atomically only when at least one verified
1-, 3-, or 6-month rate changes. Unchanged values and source/validation failures
do not overwrite the last verified rates. `GET /api/eibor` distinguishes
`fresh`, `stale`, and `unavailable` data; stale values are labeled as stale in
the homepage and missing values are never replaced with hardcoded rates. No
EIBOR email notifications are sent.

The source URL defaults to
`https://centralbank.ae/umbraco/Surface/Eibor/GetEiborData` and can be set with
`EIBOR_SOURCE_URL` in the private deployment environment. The parser targets
the HTML table currently rendered by that official endpoint; this is not a
documented, versioned API contract. CBUAE access terms for automated
retrieval/redistribution have not been verified. In this environment, ordinary
ordinary requests to both the page and data endpoint receive HTTP 403. Do not
bypass that restriction. No free, permitted machine-readable alternative has
been verified. The replaceable source adapter currently targets only the
official CBUAE endpoint; live daily updates remain blocked until CBUAE-approved
server access and data reuse are confirmed. Failed retrievals preserve stored
values and expose a sanitized source status to administrators. If no successful
fetch has populated the rates table, the API reports `unavailable` and the
homepage does not display any rate values.

The CBUAE page also links to year-specific XLS/XLSX history files. The current
2026 workbook was directly retrievable as an XLSX, but at inspection it
contained monthly sheets only through 30 September while the official page
showed a 12 October fixing. It is therefore not used as a fallback for the
latest daily rates. CBUAE data reuse/redistribution terms for this site use
have not been independently confirmed.

### Tests

From `backend/`:

```powershell
python -m pytest tests -q
```

The backend test fixture configures a temporary SQLite database and blocks
external network access. These tests do not establish PostgreSQL migration
compatibility or verify real Graph, SharePoint, OneDrive, or production
behavior.

The PostgreSQL contact-throttle integration test is opt-in and only accepts a
loopback PostgreSQL database named `first_home_test` or
`first_home_test_<hex>`. In GitHub Actions it also accepts the dedicated
`first_home_ci` service database. The test creates and drops its own randomly
named schema; never point it at a production or shared database:

```powershell
$env:POSTGRES_TEST_DATABASE_URL = "<disposable loopback PostgreSQL URL>"
$env:FIRST_HOME_ALLOW_POSTGRES_TESTS = "true"
python -m pytest tests/test_contact_rate_limit_postgres.py -q
```

## Database migrations

Alembic migrations change the target database. Run them only after confirming
that `DATABASE_URL` points to the intended disposable or approved database.
Never run these commands against production as part of local verification:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic heads
```

Docker Compose waits for PostgreSQL health but does not apply migrations.
Release verification must include applying the migrations to a disposable
PostgreSQL instance and running PostgreSQL-backed integration tests.

### Production administrator bootstrap

The Docker Compose deployment expects PostgreSQL at the `db` service and
requires a private `.env.docker` containing `DATABASE_URL` and the matching
`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` values. The URL must
use the PostgreSQL service name, for example
`postgresql+psycopg://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>`.
Keep the populated environment file out of source control and do not print its
values. Configure the remaining Compose secrets and TLS settings documented
below before deployment. The presence of this configuration does not prove
that a production deployment is running or reachable.

After explicitly confirming that `.env.docker` identifies the intended
deployment database, apply migrations before starting application traffic or
verifying admin access:

```powershell
docker compose --env-file .env.docker up -d db
docker compose --env-file .env.docker run --rm backend python -m alembic upgrade head
docker compose --env-file .env.docker run --rm backend python create_admin.py
```

The bootstrap prompts for the administrator email and full name, reads a new
password through a hidden local prompt, and asks for it twice. Use Sajid's
verified email and name; never reuse a development password hash or place a
password in source, shell history, or deployment logs. It is safe to rerun:
the same active administrator is left unchanged, a matching existing
non-admin account requires explicit `PROMOTE` confirmation, and an inactive
or identity-mismatched account is rejected. The bootstrap does not demote
other administrators or delete users. Both commands use the configured
deployment database and must not be run until its target is confirmed.

On a machine with a running Docker Engine, an isolated local test can use a
throwaway PostgreSQL container. This may download the `postgres:17` image if
it is not cached, binds port 55432 on loopback, and stores data only in the
container's disposable filesystem:

```powershell
docker run --rm --name first-home-postgres-test -d `
  -e POSTGRES_DB=first_home_test `
  -e POSTGRES_USER=firsthome_test `
  -e POSTGRES_PASSWORD=temporary-test-only `
  -p 127.0.0.1:55432:5432 postgres:17
docker exec first-home-postgres-test pg_isready -U firsthome_test -d first_home_test
Set-Location backend
$env:DATABASE_URL = "postgresql+psycopg://firsthome_test:temporary-test-only@127.0.0.1:55432/first_home_test"
python -m alembic upgrade head
$env:POSTGRES_TEST_DATABASE_URL = $env:DATABASE_URL
python -m pytest -p no:cacheprovider tests/test_contact_rate_limit_postgres.py -q
docker stop first-home-postgres-test
```

The migration command changes only the disposable container database. The
integration test creates and drops a unique schema inside that database.
`docker stop` removes the container because it was started with `--rm`. Do
not substitute a shared or production database or real credentials. These
commands were not run here because the Docker Linux Engine was unavailable.

## Deployment and operations

The Compose stack is configured for production mode and publishes Nginx ports
80 and 443. It requires host-managed Let's Encrypt files; HTTPS is not
operational until DNS, certificate issuance, firewall access, certificate
mounts, and post-deployment HTTPS checks have all succeeded. No certificate
path or successful deployment is assumed by this repository.

### Host-managed Let's Encrypt certificates

Before deployment, point both `firsthomefintech.ae` and
`www.firsthomefintech.ae` at the VPS and allow inbound TCP ports 80 and 443.
Provision certificates on the host with the organization's approved Certbot
challenge method. For the standalone HTTP challenge, run the following from
the deployment host after confirming DNS and during an approved maintenance
window:

```sh
docker compose --env-file .env.docker stop nginx
sudo certbot certonly --standalone --preferred-challenges http \
  -d firsthomefintech.ae -d www.firsthomefintech.ae
docker compose --env-file .env.docker up -d nginx
```

This stops the public proxy, contacts the ACME service, writes certificate
files on the VPS, then starts Nginx and any missing API/frontend/database
dependencies. It does not start the notification worker or backup service.
The standalone challenge requires port 80 to be free. Confirm the
organization's DNS, firewall, Certbot and certificate-name settings before
running; do not run this as a local verification step.

Set these Compose variables in the private deployment environment file,
without committing or printing its values:

- `LETSENCRYPT_ROOT`: the actual host directory containing the Let's Encrypt
  certificate tree, mounted read-only at `/etc/letsencrypt` in Nginx.
- `TLS_CERTIFICATE_PATH`: the corresponding full-chain path inside that
  mounted tree.
- `TLS_PRIVATE_KEY_PATH`: the corresponding private-key path inside that
  mounted tree.
- `NGINX_PROXY_IP` and `DOCKER_SUBNET`: the Nginx container's fixed address
  and a non-overlapping private subnet. If either is customized, set them
  consistently; backend forwarded-header trust is limited to
  `NGINX_PROXY_IP`.

The template substitutes only the certificate path variables, validates
Nginx configuration at container startup, and then listens on HTTPS. HTTP
requests are redirected to HTTPS. Nginx overwrites `X-Real-IP` and
`X-Forwarded-For` with the socket peer address instead of preserving
user-supplied forwarding headers. The backend honors `X-Real-IP` only when
the connection peer is exactly the configured Nginx address. The Compose
backend port is not published to the host.

After the host certificate-renewal process updates the mounted tree, validate
and reload Nginx from the repository directory:

```powershell
sudo certbot renew
docker compose --env-file .env.docker exec -T nginx nginx -t
docker compose --env-file .env.docker exec -T nginx nginx -s reload
```

`certbot renew` contacts the ACME service and may update host certificate
files. The following commands require an already-running Nginx container;
they validate its configuration and reload it to read renewed certificates.
Confirm the host renewal timer and arrange an approved deploy hook for the
validation/reload commands before relying on unattended renewals. No DNS,
firewall, certificate, or deployment operation has been performed as part of
this repository work.

Production mode sets the session cookie's `Secure` attribute. A TLS
termination, cookie, and trusted-proxy smoke test over the intended public
HTTPS origin is still required before launch.

For an isolated syntax check, a machine with Docker Engine and OpenSSL can
generate a throwaway one-day self-signed certificate outside the repository
and validate the rendered Nginx template:

```powershell
$testCertDir = Join-Path $env:TEMP ("first-home-nginx-test-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $testCertDir
openssl req -x509 -nodes -newkey rsa:2048 -days 1 `
  -subj "/CN=test.invalid" `
  -keyout (Join-Path $testCertDir "privkey.pem") `
  -out (Join-Path $testCertDir "fullchain.pem")
$templatePath = (Resolve-Path "nginx\nginx.conf.template").Path
docker run --rm `
  --add-host frontend:127.0.0.1 `
  --add-host backend:127.0.0.1 `
  --env TLS_CERTIFICATE_PATH=/tmp/tls/fullchain.pem `
  --env TLS_PRIVATE_KEY_PATH=/tmp/tls/privkey.pem `
  --mount "type=bind,source=$templatePath,target=/etc/nginx/nginx.conf.template,readonly" `
  --mount "type=bind,source=$testCertDir,target=/tmp/tls,readonly" `
  nginx:alpine sh -ec 'envsubst "$TLS_CERTIFICATE_PATH $TLS_PRIVATE_KEY_PATH" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf; nginx -t'
Remove-Item -LiteralPath $testCertDir -Recurse
```

Docker may download `nginx:alpine`; the command starts only a temporary
container, maps the upstream names to loopback for config parsing, and does
not start the application, notification worker, or backup service. The
temporary key is test-only and the directory is removed by the last command.
This checks Nginx syntax and certificate readability, not live proxy routing,
real certificate identity, public HTTPS, or deployment readiness.

### Contact abuse controls

Nginx applies its existing per-address limit. The backend also stores
per-client-IP counters in PostgreSQL: five submissions per 60-second window,
with a maximum of 10,000 active IP-hash rows and expiry cleanup. The IP hash
is pseudonymous operational data, not anonymization. An additional
two-per-15-minute email limit remains process-local and is secondary to the
PostgreSQL control. Distributed abuse can still evade per-IP controls and
needs ongoing monitoring and an approved challenge/response plan if the threat
model requires one.

The notification outbox retries failed delivery. The worker holds a database
row lock through the provider call and records an attempt only after that call
returns or fails; an interruption before dispatch rolls back the claim without
consuming the retry budget. Delivery remains at-least-once: if Microsoft Graph
accepts a message but recording success fails, a retry may send a duplicate.
An outbox `SENT` state indicates acceptance by Graph, not confirmed mailbox
delivery.

### Sensitive data, documents, and recovery

The ignored local `backend.zip` archive was found to contain `backend/.env`
and the backend virtual environment. The working repository is under a
OneDrive directory and also contains ignored environment and backup-key
artifacts. Their sync/sharing status and the contents of credential values
were not inspected; no values are included here. `.gitignore` prevents
accidental Git tracking but does not protect local or synchronized files.
Preserve these artifacts until an owner-approved exposure assessment; do not
assume that ignoring them makes the credentials safe.

SharePoint file upload occurs before database metadata is committed. If that
commit fails, the API reports that the SharePoint binary may exist without a
database record; there is no automated orphan reconciliation. File signature
checks are not malware scanning. Sensitive lead, case, export, and document
case, case-document, lead-mutation, and lead-export routes require backend
administrator authorization. Authenticated consultants can read the limited
lead summary and lead details through `/api/consultant/leads`; the consultant
interface hides administrator-only export, case navigation, and lead-management
controls. The backend still enforces authentication and administrator checks
independently of frontend visibility. `backend/create_admin.py` creates an
administrator or safely reruns against the same active account; it requires
explicit confirmation before promoting a matching existing account.
`backend/promote_admin.py` also requires explicit confirmation to change an
existing account's role.

The backup service creates a custom-format PostgreSQL dump, encrypts it with
GPG symmetric AES-256, uploads to OneDrive, confirms that the uploaded item is
listed, then applies remote retention. Retention can delete remote backups;
do not run it without explicit approval. Listing is not a decryption or
restore-integrity check. An isolated restore procedure is documented below, but it has not yet been executed or verified. The encryption key's independent custody is unverified.
PostgreSQL backups exclude SharePoint binaries, so document recovery needs a
separate approved SharePoint retention/export/recovery plan.

Do not run backup, upload, retention, cloud permission, credential rotation,
or restore operations without approval and an isolated test plan.

### Explicit backup recovery (separate stages)

The `recovery-download` and `recovery-restore` services are opt-in under the
`recovery` profile and are never started by the regular stack. The normal
backup service entry point, schedule, retention policy, and passphrase are
unchanged. Recovery requires an approved operator and a unique Compose project
name used only for this recovery attempt.

First, choose one exact filename from the existing timestamped backup naming
pattern, `firsthome-db-<UTC timestamp>.dump.gpg`. Supply the Graph configuration
through the existing private deployment environment, and invoke only the
download stage:

```powershell
$recoveryProject = "first-home-recovery-" + [guid]::NewGuid().ToString("N")
$selectedBackup = Read-Host "Enter the exact selected backup filename"

docker compose --env-file .env.docker --profile recovery -p $recoveryProject `
  run --rm recovery-download download --filename $selectedBackup
```

This stage receives Graph credentials but no database credentials and no
encryption passphrase. It performs read-only Graph operations to select that
exact file and downloads the encrypted file into the project-scoped
`recovery_artifacts` Docker volume. It does not run the backup workflow or
retention. The download container is removed after the command; the encrypted
artifact remains in the private project volume for the next stage.

Then explicitly invoke the restore stage with a newly generated disposable
database password supplied as `RECOVERY_DB_PASSWORD` in the operator's
protected environment. Do not reuse the production database password. The
command requires explicit disposable-target confirmation:

```powershell
docker compose --env-file .env.docker --profile recovery -p $recoveryProject `
  run --rm recovery-restore restore --filename $selectedBackup `
  --confirm-disposable-target
```

The recovery database password must be present in the environment used by
Docker Compose. The Compose configuration refuses to resolve the recovery
services if `RECOVERY_DB_PASSWORD` is unset or empty. Use a dedicated,
temporary password for this isolated recovery database; do not commit it or
put it in shell history.

The restore stage has no Graph credentials and no application-network
attachment. The selected encrypted artifact is mounted read-only. The
disposable PostgreSQL service and restore container share only the internal
`recovery-isolated` network; it is configured without internet routing, host
published ports, production database credentials, or a persistent volume.
Its data directory is a temporary filesystem. The restore utility refuses
targets other than the fixed recovery database and checks that it has no
user relations before restoring. Size `RECOVERY_TMPFS_SIZE` for the encrypted
dump's plaintext size and the restored database; the default is 8 GiB and
insufficient capacity will cause recovery to fail.

Decrypted dump data and GPG working files are created only in a restricted
temporary directory on the restore container's tmpfs. The utility attempts
scoped cleanup on success and failure. A cleanup failure is reported as a
failed recovery operation and must be investigated before considering the
recovery successful. Stopping and removing the one-off restore container also
destroys its tmpfs. The encrypted artifact persists until the recovery
project's volume is removed.

After verifying the isolated restore, inspect the selected project and remove
only its recovery containers, networks, and encrypted artifact volume:

```powershell
docker compose --env-file .env.docker --profile recovery -p $recoveryProject ps -a
docker compose --env-file .env.docker --profile recovery -p $recoveryProject down -v --remove-orphans
```

Use a unique project name, confirm it identifies only this recovery attempt,
and do not use broad Docker cleanup commands. PostgreSQL restore does not
recover SharePoint document binaries; those require a separate approved
recovery plan.

## Release readiness

Before public launch, verify frontend-to-API routing, live HTTPS and session
cookies, backend authorization, current CI and tests, PostgreSQL migrations
and per-IP throttling, notification failure handling, SharePoint permissions
and orphan recovery, encrypted backup decryption and restore, and
document-binary recovery. Confirm production logging, monitoring, rollback,
and incident/recovery procedures as well.
