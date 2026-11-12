"""a customer's saved delivery address

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12 17:00:00

customers.address: the address a customer chose to save at checkout, to fill in the next one.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: str | Sequence[str] | None = '0003'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('customers', sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('customers', 'address')
