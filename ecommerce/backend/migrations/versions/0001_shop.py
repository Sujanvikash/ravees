"""the shop: customers, admin, catalogue, photos, showrooms, testimonials, enquiries, orders

Revision ID: 0001
Revises:
Create Date: 2026-11-11 14:39:20.832589

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'admins',
        sa.Column('username', sa.String(length=40), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('username', name=op.f('pk_admins')),
    )
    op.create_table(
        'customers',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_customers')),
        sa.UniqueConstraint('email', name=op.f('uq_customers_email')),
    )
    op.create_table(
        'images',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('large', sa.LargeBinary(), nullable=True),
        sa.Column('card', sa.LargeBinary(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_images')),
    )
    op.create_table(
        'number_series',
        sa.Column('period', sa.String(length=8), nullable=False),
        sa.Column('next_no', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('period', name=op.f('pk_number_series')),
    )
    op.create_table(
        'shop_settings',
        sa.Column('key', sa.String(length=40), nullable=False),
        sa.Column('value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('key', name=op.f('pk_shop_settings')),
    )
    op.create_table(
        'showrooms',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('city', sa.String(length=60), nullable=False),
        sa.Column('is_flagship', sa.Boolean(), nullable=False),
        sa.Column('title', sa.String(length=160), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('phone', sa.String(length=80), nullable=False),
        sa.Column('timing', sa.String(length=80), nullable=False),
        sa.Column('features', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('map_query', sa.String(length=200), nullable=False),
        sa.Column('stores', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_showrooms')),
    )
    op.create_table(
        'testimonials',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('author', sa.String(length=120), nullable=False),
        sa.Column('location', sa.String(length=80), nullable=False),
        sa.Column('quote', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('tree_model', sa.String(length=120), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_testimonials')),
    )
    op.create_table(
        'categories',
        sa.Column('id', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('icon', sa.String(length=16), nullable=False),
        sa.Column('image_id', sa.Uuid(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('visible', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ['image_id'], ['images.id'], name=op.f('fk_categories_image_id_images'), ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_categories')),
    )
    op.create_table(
        'enquiries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=False),
        sa.Column('city', sa.String(length=80), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('customer_id', sa.Uuid(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['customer_id'], ['customers.id'], name=op.f('fk_enquiries_customer_id_customers'), ondelete='SET NULL'
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_enquiries')),
    )
    op.create_index(op.f('ix_enquiries_created_at'), 'enquiries', ['created_at'], unique=False)
    op.create_index(op.f('ix_enquiries_status'), 'enquiries', ['status'], unique=False)
    op.create_table(
        'orders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('number', sa.String(length=24), nullable=False),
        sa.Column('customer_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('delivery', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=40), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=40), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('history', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], name=op.f('fk_orders_customer_id_customers')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_orders')),
        sa.UniqueConstraint('number', name=op.f('uq_orders_number')),
        sa.UniqueConstraint('razorpay_order_id', name=op.f('uq_orders_razorpay_order_id')),
    )
    op.create_index(op.f('ix_orders_created_at'), 'orders', ['created_at'], unique=False)
    op.create_index(op.f('ix_orders_customer_id'), 'orders', ['customer_id'], unique=False)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_table(
        'password_resets',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('customer_id', sa.Uuid(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['customer_id'], ['customers.id'], name=op.f('fk_password_resets_customer_id_customers'), ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_password_resets')),
        sa.UniqueConstraint('token_hash', name=op.f('uq_password_resets_token_hash')),
    )
    op.create_index(op.f('ix_password_resets_customer_id'), 'password_resets', ['customer_id'], unique=False)
    op.create_table(
        'products',
        sa.Column('id', sa.String(length=120), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('category_id', sa.String(length=80), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('specs', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('sizes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('mrp', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('in_stock', sa.Boolean(), nullable=False),
        sa.Column('visible', sa.Boolean(), nullable=False),
        sa.Column('featured', sa.Boolean(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('image_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name=op.f('fk_products_category_id_categories')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_products')),
    )
    op.create_index(op.f('ix_products_category_id'), 'products', ['category_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_products_category_id'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_password_resets_customer_id'), table_name='password_resets')
    op.drop_table('password_resets')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_customer_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_created_at'), table_name='orders')
    op.drop_table('orders')
    op.drop_index(op.f('ix_enquiries_status'), table_name='enquiries')
    op.drop_index(op.f('ix_enquiries_created_at'), table_name='enquiries')
    op.drop_table('enquiries')
    op.drop_table('categories')
    op.drop_table('testimonials')
    op.drop_table('showrooms')
    op.drop_table('shop_settings')
    op.drop_table('number_series')
    op.drop_table('images')
    op.drop_table('customers')
    op.drop_table('admins')
