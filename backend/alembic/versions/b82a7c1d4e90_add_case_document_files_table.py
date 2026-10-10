
"""add case document files table

Revision ID: b82a7c1d4e90
Revises: 7f0e5f17936b
Create Date: 2026-10-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b82a7c1d4e90"
down_revision: Union[str, Sequence[str], None] = "7f0e5f17936b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "case_document_files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("case_document_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_filename", sa.String(length=500), nullable=False),
        sa.Column("drive_item_id", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["case_document_id"],
            ["case_documents.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_filename"),
        sa.UniqueConstraint("drive_item_id"),
    )

    op.create_index(
        "ix_case_document_files_case_document_id",
        "case_document_files",
        ["case_document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_case_document_files_case_document_id",
        table_name="case_document_files",
    )
    op.drop_table("case_document_files")
