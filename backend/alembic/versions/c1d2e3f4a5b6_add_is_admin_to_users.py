
"""Add administrator flag to users.

Revision ID: c1d2e3f4a5b6
Revises: b82a7c1d4e90
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "b82a7c1d4e90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Existing users receive the database default of False.
    # Remove the permanent server default after the column is populated.
    op.alter_column(
        "users",
        "is_admin",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
