"""Purchase returns valued at D.Rate (no GST): what the showroom held of each product when it sent and, at the end of
the season, what it didn't send at all (so the admin sees how much was and wasn't returned, in units and value), the
showroom as the return names it, and the e-way bill and transport of the goods.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-12

Returns sent before this keep their lines as they are, with no issuer, value or held quantities.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None

COLUMNS = (
    sa.Column('kept', JSONB(), nullable=True),
    sa.Column('issuer', JSONB(), nullable=True),
    sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
    sa.Column('lr_no', sa.String(64), nullable=False, server_default=''),
    sa.Column('vehicle_no', sa.String(32), nullable=False, server_default=''),
    sa.Column('cartons', sa.Integer(), nullable=True),
    sa.Column('eway_no', sa.String(32), nullable=False, server_default=''),
    sa.Column('doc_name', sa.String(200), nullable=False, server_default=''),
    sa.Column('doc_data', sa.LargeBinary(), nullable=True),
)


def upgrade() -> None:
    for column in COLUMNS:
        op.add_column('stock_returns', column)


def downgrade() -> None:
    for column in reversed(COLUMNS):
        op.drop_column('stock_returns', column.name)
