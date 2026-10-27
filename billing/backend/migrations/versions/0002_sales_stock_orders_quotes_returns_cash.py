"""Sales, stock, purchase orders, quotations, returns, stock returns, cash closes and number series.

Generated with autogenerate against 0001; constraint names follow the naming convention in app/core/database.py.
The demo schema isn't migrated: it is rebuilt from the models (python -m app.cli demo).

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-27
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'cash_closes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('day', sa.Date(), nullable=False),
        sa.Column('opening', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('cash_sales', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('cash_refunds', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('expected', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('counted', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('difference', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('float_next', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('other', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('denominations', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('by', sa.String(length=32), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_cash_closes_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_cash_closes')),
        sa.UniqueConstraint('location_id', 'day', name=op.f('uq_cash_closes_location_id')),
    )
    op.create_index(op.f('ix_cash_closes_day'), 'cash_closes', ['day'], unique=False)
    op.create_index(op.f('ix_cash_closes_location_id'), 'cash_closes', ['location_id'], unique=False)
    op.create_table(
        'number_series',
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('period', sa.String(length=8), nullable=False),
        sa.Column('next_no', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_number_series_location_id_locations')),
        sa.PrimaryKeyConstraint('location_id', 'kind', 'period', name=op.f('pk_number_series')),
    )
    op.create_table(
        'purchase_orders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('number', sa.String(length=32), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('counted', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('history', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['location_id'], ['locations.id'], name=op.f('fk_purchase_orders_location_id_locations')
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_purchase_orders')),
        sa.UniqueConstraint('number', name=op.f('uq_purchase_orders_number')),
    )
    op.create_index(op.f('ix_purchase_orders_location_id'), 'purchase_orders', ['location_id'], unique=False)
    op.create_index(op.f('ix_purchase_orders_status'), 'purchase_orders', ['status'], unique=False)
    op.create_index(op.f('ix_purchase_orders_updated_at'), 'purchase_orders', ['updated_at'], unique=False)
    op.create_table(
        'quotes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('quote_no', sa.String(length=32), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('by', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=16), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('totals', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_by', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_quotes_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_quotes')),
        sa.UniqueConstraint('quote_no', name=op.f('uq_quotes_quote_no')),
    )
    op.create_index(op.f('ix_quotes_at'), 'quotes', ['at'], unique=False)
    op.create_index(op.f('ix_quotes_location_id'), 'quotes', ['location_id'], unique=False)
    op.create_table(
        'sales',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('bill_no', sa.String(length=32), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('phone', sa.String(length=16), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('totals', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('payment', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_by', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_sales_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sales')),
        sa.UniqueConstraint('bill_no', name=op.f('uq_sales_bill_no')),
    )
    op.create_index(op.f('ix_sales_at'), 'sales', ['at'], unique=False)
    op.create_index(op.f('ix_sales_created_at'), 'sales', ['created_at'], unique=False)
    op.create_index(op.f('ix_sales_location_id'), 'sales', ['location_id'], unique=False)
    op.create_table(
        'stock_imports',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('by', sa.String(length=64), nullable=False),
        sa.Column('username', sa.String(length=32), nullable=False),
        sa.Column('file', sa.String(length=200), nullable=False),
        sa.Column('source', sa.String(length=32), nullable=True),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_stock_imports_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_stock_imports')),
    )
    op.create_index(op.f('ix_stock_imports_at'), 'stock_imports', ['at'], unique=False)
    op.create_index(op.f('ix_stock_imports_location_id'), 'stock_imports', ['location_id'], unique=False)
    op.create_table(
        'stock_returns',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('number', sa.String(length=32), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('reason', sa.String(length=32), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('counted', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('history', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_stock_returns_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_stock_returns')),
        sa.UniqueConstraint('number', name=op.f('uq_stock_returns_number')),
    )
    op.create_index(op.f('ix_stock_returns_location_id'), 'stock_returns', ['location_id'], unique=False)
    op.create_index(op.f('ix_stock_returns_status'), 'stock_returns', ['status'], unique=False)
    op.create_table(
        'sale_lines',
        sa.Column('sale_id', sa.Uuid(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('mrp', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('cost', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('gst', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['code'], ['products.code'], name=op.f('fk_sale_lines_code_products')),
        sa.ForeignKeyConstraint(
            ['sale_id'], ['sales.id'], name=op.f('fk_sale_lines_sale_id_sales'), ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('sale_id', 'position', name=op.f('pk_sale_lines')),
    )
    op.create_index(op.f('ix_sale_lines_code'), 'sale_lines', ['code'], unique=False)
    op.create_table(
        'sale_returns',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('return_no', sa.String(length=32), nullable=False),
        sa.Column('sale_id', sa.Uuid(), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('lines', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('refund', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('exchange_sale_id', sa.Uuid(), nullable=True),
        sa.Column('created_by', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(
            ['exchange_sale_id'], ['sales.id'], name=op.f('fk_sale_returns_exchange_sale_id_sales')
        ),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_sale_returns_location_id_locations')),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], name=op.f('fk_sale_returns_sale_id_sales')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sale_returns')),
        sa.UniqueConstraint('return_no', name=op.f('uq_sale_returns_return_no')),
    )
    op.create_index(op.f('ix_sale_returns_at'), 'sale_returns', ['at'], unique=False)
    op.create_index(op.f('ix_sale_returns_location_id'), 'sale_returns', ['location_id'], unique=False)
    op.create_index(op.f('ix_sale_returns_sale_id'), 'sale_returns', ['sale_id'], unique=False)
    op.create_table(
        'stock_levels',
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['code'], ['products.code'], name=op.f('fk_stock_levels_code_products')),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_stock_levels_location_id_locations')),
        sa.PrimaryKeyConstraint('location_id', 'code', name=op.f('pk_stock_levels')),
    )


def downgrade() -> None:
    op.drop_table('stock_levels')
    op.drop_index(op.f('ix_sale_returns_sale_id'), table_name='sale_returns')
    op.drop_index(op.f('ix_sale_returns_location_id'), table_name='sale_returns')
    op.drop_index(op.f('ix_sale_returns_at'), table_name='sale_returns')
    op.drop_table('sale_returns')
    op.drop_index(op.f('ix_sale_lines_code'), table_name='sale_lines')
    op.drop_table('sale_lines')
    op.drop_index(op.f('ix_stock_returns_status'), table_name='stock_returns')
    op.drop_index(op.f('ix_stock_returns_location_id'), table_name='stock_returns')
    op.drop_table('stock_returns')
    op.drop_index(op.f('ix_stock_imports_location_id'), table_name='stock_imports')
    op.drop_index(op.f('ix_stock_imports_at'), table_name='stock_imports')
    op.drop_table('stock_imports')
    op.drop_index(op.f('ix_sales_location_id'), table_name='sales')
    op.drop_index(op.f('ix_sales_created_at'), table_name='sales')
    op.drop_index(op.f('ix_sales_at'), table_name='sales')
    op.drop_table('sales')
    op.drop_index(op.f('ix_quotes_location_id'), table_name='quotes')
    op.drop_index(op.f('ix_quotes_at'), table_name='quotes')
    op.drop_table('quotes')
    op.drop_index(op.f('ix_purchase_orders_updated_at'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_status'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_location_id'), table_name='purchase_orders')
    op.drop_table('purchase_orders')
    op.drop_table('number_series')
    op.drop_index(op.f('ix_cash_closes_location_id'), table_name='cash_closes')
    op.drop_index(op.f('ix_cash_closes_day'), table_name='cash_closes')
    op.drop_table('cash_closes')
