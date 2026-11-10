"""Who an invoice is to, as printed on it: the showroom's name, address, phone, GSTIN and state, and whether the
supply is inter-state (IGST) or inside the admin's state, Tamil Nadu (CGST + SGST).

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-10

Invoices raised before this have neither: they print the showroom's details as they are now.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('transfer_invoices', sa.Column('buyer', postgresql.JSONB(), nullable=True))
    op.add_column('transfer_invoices', sa.Column('inter_state', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('transfer_invoices', 'inter_state')
    op.drop_column('transfer_invoices', 'buyer')
