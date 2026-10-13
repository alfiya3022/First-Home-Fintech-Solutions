"""add persisted EIBOR rates

Revision ID: b71a9c4e2d63
Revises: 9b6e4f1a2c87
Create Date: 2026-10-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b71a9c4e2d63"
down_revision: Union[str, Sequence[str], None] = "9b6e4f1a2c87"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "eibor_rates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("one_month", sa.Numeric(9, 6), nullable=False),
        sa.Column("three_month", sa.Numeric(9, 6), nullable=False),
        sa.Column("six_month", sa.Numeric(9, 6), nullable=False),
        sa.Column("publication_date", sa.Date(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.CheckConstraint("id = 1", name="ck_eibor_rates_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("eibor_rates")
