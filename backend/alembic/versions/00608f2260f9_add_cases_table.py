"""add cases table

Revision ID: 00608f2260f9
Revises: c5d0aebdd80c
Create Date: 2026-10-05 22:38:39.328084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "00608f2260f9"
down_revision: Union[str, Sequence[str], None] = "c5d0aebdd80c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


case_status_enum = sa.Enum(
    "OPEN",
    "DOCUMENTS_PENDING",
    "DOCUMENTS_RECEIVED",
    "UNDER_REVIEW",
    "SUBMITTED",
    "APPROVED",
    "COMPLETED",
    "CANCELLED",
    name="case_status",
    create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""

    case_status_enum.create(
        op.get_bind(),
        checkfirst=True,
    )

    op.create_table(
        "cases",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "lead_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "case_reference",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "status",
            case_status_enum,
            nullable=False,
        ),
        sa.Column(
            "property_type",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "property_value",
            sa.Numeric(precision=15, scale=2),
            nullable=True,
        ),
        sa.Column(
            "loan_amount",
            sa.Numeric(precision=15, scale=2),
            nullable=True,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["lead_id"],
            ["leads.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("case_reference"),
        sa.UniqueConstraint("lead_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_table("cases")

    case_status_enum.drop(
        op.get_bind(),
        checkfirst=True,
    )