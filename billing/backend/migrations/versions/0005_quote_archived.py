"""Quotations are archived, not deleted: an `archived_at` timestamp on quotes (null = live).

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-03
"""

import sqlalchemy as sa
from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('quotes', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('quotes', 'archived_at')
