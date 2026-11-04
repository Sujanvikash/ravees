"""Boxes: supplier-packed boxes sent on to a showroom, with what is in each, counted in by the showroom.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'boxes',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('box_no', sa.String(32), nullable=False, unique=True),
        sa.Column('stock_no', sa.String(32), nullable=False, server_default=''),
        sa.Column('shipment', sa.String(120), nullable=False, server_default=''),
        sa.Column('supplier', sa.String(120), nullable=False, server_default=''),
        sa.Column('location_id', sa.String(32), sa.ForeignKey('locations.id'), nullable=True),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('lines', postgresql.JSONB(), nullable=False),
        sa.Column('counted', postgresql.JSONB(), nullable=True),
        sa.Column('history', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_boxes_stock_no', 'boxes', ['stock_no'])
    op.create_index('ix_boxes_location_id', 'boxes', ['location_id'])
    op.create_index('ix_boxes_status', 'boxes', ['status'])


def downgrade() -> None:
    op.drop_table('boxes')
