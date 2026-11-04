"""Stores can be added and removed: an `active` flag on locations so a removed store with history is kept
(hidden from sign-in) rather than deleted.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-03
"""

import sqlalchemy as sa
from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('locations', sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column('locations', 'active')
