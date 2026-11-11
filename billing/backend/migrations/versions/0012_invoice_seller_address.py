"""The admin's address an invoice is from, as printed on it: the warehouse at Manali or the registered office at
Madhavaram, picked on each invoice.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-11

Invoices raised before this have none: they print the business address in Settings, as before.
"""

import sqlalchemy as sa
from alembic import op

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('transfer_invoices', sa.Column('seller_address', sa.Text(), nullable=False, server_default=''))


def downgrade() -> None:
    op.drop_column('transfer_invoices', 'seller_address')
