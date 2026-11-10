"""Quotations to a business: its name, address and GSTIN, and the delivery date.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-08
"""

import sqlalchemy as sa
from alembic import op

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('quotes', sa.Column('company', sa.String(120), nullable=False, server_default=''))
    op.add_column('quotes', sa.Column('address', sa.Text(), nullable=False, server_default=''))
    op.add_column('quotes', sa.Column('gstin', sa.String(15), nullable=False, server_default=''))
    op.add_column('quotes', sa.Column('delivery_date', sa.Date(), nullable=True))


def downgrade() -> None:
    for column in ('delivery_date', 'gstin', 'address', 'company'):
        op.drop_column('quotes', column)
