"""add case documents table

Revision ID: 7f0e5f17936b
Revises: 468824180b1e
Create Date: 2026-10-06 17:20:07.791860
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f0e5f17936b"
down_revision: Union[str, Sequence[str], None] = "468824180b1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the PostgreSQL enum explicitly.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'case_document_status'
            ) THEN
                CREATE TYPE case_document_status AS ENUM ('PENDING', 'RECEIVED');
            END IF;
        END
        $$;
        """
    )

    # Tell SQLAlchemy that the enum already exists.
    case_document_status = sa.Enum(
        "PENDING",
        "RECEIVED",
        name="case_document_status",
        create_type=False,
    )

    op.create_table(
        "case_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=100), nullable=False),
        sa.Column("status", case_document_status, nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("case_documents")

    op.execute(
        """
        DROP TYPE IF EXISTS case_document_status;
        """
    )