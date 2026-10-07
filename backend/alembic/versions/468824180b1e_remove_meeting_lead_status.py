"""remove meeting lead status

Revision ID: 468824180b1e
Revises: 00608f2260f9
Create Date: 2026-10-05 23:34:09.829793
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "468824180b1e"
down_revision: Union[str, Sequence[str], None] = "00608f2260f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL does not support directly removing a value
    # from an existing enum type.
    #
    # Recreate the enum without MEETING.

    op.execute(
        """
        ALTER TYPE lead_status RENAME TO lead_status_old;
        """
    )

    op.execute(
        """
        CREATE TYPE lead_status AS ENUM (
            'NEW',
            'CONTACTED',
            'CONVERTED',
            'CLOSED'
        );
        """
    )

    op.execute(
        """
        ALTER TABLE leads
        ALTER COLUMN status
        TYPE lead_status
        USING status::text::lead_status;
        """
    )

    op.execute(
        """
        DROP TYPE lead_status_old;
        """
    )


def downgrade() -> None:
    # Recreate the previous enum including MEETING.

    op.execute(
        """
        ALTER TYPE lead_status RENAME TO lead_status_old;
        """
    )

    op.execute(
        """
        CREATE TYPE lead_status AS ENUM (
            'NEW',
            'CONTACTED',
            'MEETING',
            'CONVERTED',
            'CLOSED'
        );
        """
    )

    op.execute(
        """
        ALTER TABLE leads
        ALTER COLUMN status
        TYPE lead_status
        USING status::text::lead_status;
        """
    )

    op.execute(
        """
        DROP TYPE lead_status_old;
        """
    )