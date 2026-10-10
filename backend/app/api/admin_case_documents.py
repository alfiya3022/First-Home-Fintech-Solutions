
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4
import zipfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from database import SessionLocal
from app.core.auth import require_admin
from app.models.cases import Case
from app.models.case_documents import CaseDocument, CaseDocumentStatus
from app.models.case_document_files import CaseDocumentFile
from app.schemas.case_documents import (
    CaseDocumentListResponse,
    CaseDocumentResponse,
    CaseDocumentStatusUpdate,
)
from app.services.sharepoint_service import get_sharepoint_service


router = APIRouter(
    prefix="/api/admin/cases",
    tags=["Admin Case Documents"],
)

DEFAULT_DOCUMENTS = [
    "Emirates ID",
    "Passport",
    "Salary Certificate",
    "Bank Statement",
    "Property Documents",
]

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
}

OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SIGNATURE = b"\xff\xd8\xff"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_case_document(
    db: Session,
    case_id: int,
    document_id: int,
) -> CaseDocument:
    if db.get(Case, case_id) is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    document = db.get(CaseDocument, document_id)

    if document is None or document.case_id != case_id:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    return document


def validate_file_content(filename: str, content: bytes) -> None:
    """
    Validate file signatures and basic file structure.

    This is an additional security check, not a malware scanner.
    """

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload PDF, PNG, JPEG, Word, or Excel files.",
        )

    # PDF
    if extension == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=415,
                detail="Invalid PDF file content.",
            )
        return

    # PNG
    if extension == ".png":
        if not content.startswith(PNG_SIGNATURE):
            raise HTTPException(
                status_code=415,
                detail="Invalid PNG image content.",
            )
        return

    # JPEG
    if extension in {".jpg", ".jpeg"}:
        if not content.startswith(JPEG_SIGNATURE):
            raise HTTPException(
                status_code=415,
                detail="Invalid JPEG image content.",
            )
        return

    # Legacy Microsoft Word (.doc) and Excel (.xls)
    if extension in {".doc", ".xls"}:
        if not content.startswith(OLE_SIGNATURE):
            raise HTTPException(
                status_code=415,
                detail="Invalid legacy Office file content.",
            )
        return

    # Modern Microsoft Word (.docx) and Excel (.xlsx)
    if extension in {".docx", ".xlsx"}:
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                names = set(archive.namelist())

                has_content_types = (
                    "[Content_Types].xml" in names
                )

                if extension == ".docx":
                    valid_file = (
                        has_content_types
                        and "word/document.xml" in names
                    )
                else:
                    valid_file = (
                        has_content_types
                        and "xl/workbook.xml" in names
                    )

                if not valid_file:
                    raise HTTPException(
                        status_code=415,
                        detail="Invalid Office document content.",
                    )

        except zipfile.BadZipFile as exc:
            raise HTTPException(
                status_code=415,
                detail="Corrupted or invalid Office document.",
            ) from exc

        return


@router.get(
    "/{case_id}/documents",
    response_model=CaseDocumentListResponse,
)
def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if db.get(Case, case_id) is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    documents = (
        db.query(CaseDocument)
        .options(selectinload(CaseDocument.files))
        .filter(CaseDocument.case_id == case_id)
        .order_by(CaseDocument.id)
        .all()
    )

    if not documents:
        documents = [
            CaseDocument(
                case_id=case_id,
                document_type=name,
                status=CaseDocumentStatus.PENDING,
            )
            for name in DEFAULT_DOCUMENTS
        ]

        db.add_all(documents)
        db.commit()

        documents = (
            db.query(CaseDocument)
            .options(selectinload(CaseDocument.files))
            .filter(CaseDocument.case_id == case_id)
            .order_by(CaseDocument.id)
            .all()
        )

    return {"documents": documents}


@router.patch(
    "/{case_id}/documents/{document_id}/status",
    response_model=CaseDocumentResponse,
)
def update_case_document_status(
    case_id: int,
    document_id: int,
    payload: CaseDocumentStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    document = _get_case_document(
        db,
        case_id,
        document_id,
    )

    document.status = payload.status
    document.received_at = (
        datetime.utcnow()
        if payload.status == CaseDocumentStatus.RECEIVED
        else None
    )

    db.commit()
    db.refresh(document)

    return (
        db.query(CaseDocument)
        .options(selectinload(CaseDocument.files))
        .filter(CaseDocument.id == document.id)
        .one()
    )


@router.post(
    "/{case_id}/documents/{document_id}/files",
    response_model=CaseDocumentResponse,
    status_code=201,
)
async def upload_case_document_file(
    case_id: int,
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    document = _get_case_document(
        db,
        case_id,
        document_id,
    )

    original_name = Path(file.filename or "").name.strip()

    if not original_name or len(original_name) > 255:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename.",
        )

    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload PDF, PNG, JPEG, Word, or Excel files.",
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 25 MiB upload limit.",
        )

    # Validate the actual content before sending anything to SharePoint.
    validate_file_content(original_name, content)

    # Generate a unique storage name rather than trusting the user filename.
    storage_name = (
        f"case-{case_id}-doc-{document_id}-"
        f"{uuid4().hex}{extension}"
    )

    content_type = (
        file.content_type or "application/octet-stream"
    )

    try:
        # Upload into Mortgage Documents / Case-{case_id}/
        item = get_sharepoint_service().upload(
            case_id=case_id,
            filename=storage_name,
            content=content,
            content_type=content_type,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to upload file to SharePoint. Check the backend logs.",
        ) from exc

    if not item or not item.get("id"):
        raise HTTPException(
            status_code=502,
            detail="SharePoint did not return a file identifier.",
        )

    stored = CaseDocumentFile(
        case_document_id=document.id,
        original_filename=original_name,
        storage_filename=storage_name,
        drive_item_id=item["id"],
        content_type=content_type,
        size_bytes=len(content),
    )

    db.add(stored)

    # A successfully uploaded document is marked as received.
    document.status = CaseDocumentStatus.RECEIVED
    document.received_at = datetime.utcnow()

    try:
        db.commit()
    except Exception as exc:
        db.rollback()

        # Do not automatically delete the SharePoint file here.
        raise HTTPException(
            status_code=500,
            detail=(
                "File was uploaded to SharePoint, but its database "
                "record could not be saved. Contact an administrator."
            ),
        ) from exc

    return (
        db.query(CaseDocument)
        .options(selectinload(CaseDocument.files))
        .filter(CaseDocument.id == document.id)
        .one()
    )


@router.get(
    "/{case_id}/documents/{document_id}/files/{file_id}/download"
)
def download_case_document_file(
    case_id: int,
    document_id: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    document = _get_case_document(
        db,
        case_id,
        document_id,
    )

    stored = db.get(CaseDocumentFile, file_id)

    if stored is None or stored.case_document_id != document.id:
        raise HTTPException(
            status_code=404,
            detail="File not found.",
        )

    try:
        response = get_sharepoint_service().download(
            stored.drive_item_id
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to download file from SharePoint.",
        ) from exc

    def stream():
        try:
            for chunk in response.iter_content(
                chunk_size=1024 * 256
            ):
                if chunk:
                    yield chunk
        finally:
            response.close()

    encoded_filename = quote(stored.original_filename)

    return StreamingResponse(
        stream(),
        media_type=stored.content_type,
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{encoded_filename}"
            ),
            "Content-Length": str(stored.size_bytes),
            "X-Content-Type-Options": "nosniff",
        },
    )
