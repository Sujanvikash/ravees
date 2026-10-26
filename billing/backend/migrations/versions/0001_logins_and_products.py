"""Showrooms, logins, products and app settings.

Constraint names follow the naming convention in app/core/database.py, so autogenerate finds no difference.

Revision ID: 0001
Revises:
Create Date: 2026-10-26
"""

import sqlalchemy as sa
from alembic import op

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'locations',
        sa.Column('id', sa.String(32), nullable=False),
        sa.Column('city', sa.String(64), nullable=False),
        sa.Column('area', sa.String(64), nullable=False),
        sa.Column('bill_prefix', sa.String(8), nullable=False),
        sa.Column('next_product_no', sa.Integer, nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id', name='pk_locations'),
        sa.UniqueConstraint('bill_prefix', name='uq_locations_bill_prefix'),
    )
    op.create_table(
        'users',
        sa.Column('username', sa.String(32), nullable=False),
        sa.Column('role', sa.String(16), nullable=False),
        sa.Column('location_id', sa.String(32), nullable=True),
        sa.Column('password_hash', sa.Text, nullable=False),
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('username', name='pk_users'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name='fk_users_location_id_locations'),
    )
    op.create_table(
        'products',
        sa.Column('code', sa.String(32), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('type', sa.String(32), nullable=False),
        sa.Column('dept', sa.String(64), nullable=False),
        sa.Column('barcode', sa.String(64), nullable=False),
        sa.Column('hsn', sa.String(16), nullable=False),
        sa.Column('mrp', sa.Numeric(12, 2), nullable=False),
        sa.Column('offer', sa.Numeric(12, 2), nullable=False),
        sa.Column('cost', sa.Numeric(12, 2), nullable=False),
        sa.Column('gst', sa.Numeric(5, 2), nullable=False),
        sa.Column('in_season', sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column('shop_location_id', sa.String(32), nullable=True),
        sa.Column('created_by', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('code', name='pk_products'),
        sa.ForeignKeyConstraint(['shop_location_id'], ['locations.id'], name='fk_products_shop_location_id_locations'),
    )
    op.create_index('ix_products_barcode', 'products', ['barcode'])
    op.create_table(
        'app_settings',
        sa.Column('key', sa.String(64), nullable=False),
        sa.Column('value', sa.Text, nullable=False),
        sa.PrimaryKeyConstraint('key', name='pk_app_settings'),
    )


def downgrade() -> None:
    op.drop_table('app_settings')
    op.drop_index('ix_products_barcode', table_name='products')
    op.drop_table('products')
    op.drop_table('users')
    op.drop_table('locations')
