"""add persistent contact IP rate limits

Revision ID: 9b6e4f1a2c87
Revises: f4b92d1a6c30
Create Date: 2026-10-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9b6e4f1a2c87"
down_revision: Union[str, Sequence[str], None] = "f4b92d1a6c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_rate_limits",
        sa.Column("ip_hash", sa.String(length=64), nullable=False),
        sa.Column("window_started_at", sa.DateTime(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("ip_hash"),
    )
    op.create_index(
        "ix_contact_rate_limits_window_started_at",
        "contact_rate_limits",
        ["window_started_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contact_rate_limits_window_started_at",
        table_name="contact_rate_limits",
    )
    op.drop_table("contact_rate_limits")
