"""add lead status enum

Revision ID: c7f0e904d3c7
Revises: a9f5cbda55c5
Create Date: 2026-10-03 20:31:43.334182

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7f0e904d3c7"
down_revision: Union[str, Sequence[str], None] = "a9f5cbda55c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


lead_status_enum = sa.Enum(
    "NEW",
    "CONTACTED",
    "MEETING",
    "CONVERTED",
    "CLOSED",
    name="lead_status",
)


def upgrade() -> None:
    """Upgrade schema."""

    lead_status_enum.create(op.get_bind(), checkfirst=True)

    op.alter_column(
        "leads",
        "status",
        existing_type=sa.VARCHAR(length=20),
        type_=lead_status_enum,
        existing_nullable=False,
        postgresql_using="status::lead_status",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.alter_column(
        "leads",
        "status",
        existing_type=lead_status_enum,
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
    )

    lead_status_enum.drop(op.get_bind(), checkfirst=True)