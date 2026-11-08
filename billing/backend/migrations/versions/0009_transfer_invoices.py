"""Transfer invoices: boxes become the admin's warehouse inventory, billed to a showroom at cost + 18%.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-08

Boxes entered before this were never added to any stock (a showroom counted them in), so the boxes still packed
become `in_stock` here but are NOT added to the warehouse stock: the admin adds that stock by hand if those boxes
are really still in the warehouse. Boxes already counted in become `stocked`. Their counts are dropped.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'transfer_invoices',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('number', sa.String(32), nullable=False, unique=True),
        sa.Column('location_id', sa.String(32), sa.ForeignKey('locations.id'), nullable=False),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('lines', postgresql.JSONB(), nullable=False),
        sa.Column('markup_pct', sa.Numeric(5, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('eway_no', sa.String(32), nullable=False, server_default=''),
        sa.Column('bill_no', sa.String(64), nullable=False, server_default=''),
        sa.Column('doc_name', sa.String(200), nullable=False, server_default=''),
        sa.Column('doc_data', sa.LargeBinary(), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_ref', sa.String(100), nullable=False, server_default=''),
        sa.Column('note', sa.Text(), nullable=False, server_default=''),
        sa.Column('order_id', sa.Uuid(), sa.ForeignKey('purchase_orders.id'), nullable=True),
        sa.Column('history', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_transfer_invoices_location_id', 'transfer_invoices', ['location_id'])
    op.create_index('ix_transfer_invoices_status', 'transfer_invoices', ['status'])
    op.create_index('ix_transfer_invoices_order_id', 'transfer_invoices', ['order_id'])

    op.add_column('boxes', sa.Column('invoice_id', sa.Uuid(), sa.ForeignKey('transfer_invoices.id'), nullable=True))
    op.create_index('ix_boxes_invoice_id', 'boxes', ['invoice_id'])
    op.execute("UPDATE boxes SET status = 'stocked' WHERE status = 'received'")
    op.execute("UPDATE boxes SET status = 'in_stock', location_id = NULL WHERE status = 'packed'")
    op.drop_column('boxes', 'counted')


def downgrade() -> None:
    op.add_column('boxes', sa.Column('counted', postgresql.JSONB(), nullable=True))
    op.execute("UPDATE boxes SET status = 'received' WHERE status = 'stocked'")
    op.execute("UPDATE boxes SET status = 'packed' WHERE status IN ('in_stock', 'invoiced')")
    op.drop_index('ix_boxes_invoice_id', 'boxes')
    op.drop_column('boxes', 'invoice_id')
    op.drop_table('transfer_invoices')
