"""add persistent EIBOR monitoring status

Revision ID: 4c17a6d8e2f1
Revises: b71a9c4e2d63
Create Date: 2026-10-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4c17a6d8e2f1"
down_revision: Union[str, Sequence[str], None] = "b71a9c4e2d63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "eibor_monitoring",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
        sa.Column("last_successful_fetch_at", sa.DateTime(), nullable=True),
        sa.Column("last_successful_publication_date", sa.Date(), nullable=True),
        sa.Column("last_rate_change_at", sa.DateTime(), nullable=True),
        sa.Column(
            "source_status",
            sa.String(length=30),
            server_default="not_checked",
            nullable=False,
        ),
        sa.Column("last_error_code", sa.String(length=50), nullable=True),
        sa.CheckConstraint("id = 1", name="ck_eibor_monitoring_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("eibor_monitoring")
