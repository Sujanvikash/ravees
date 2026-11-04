"""Credit bills: a sale's `balance` still owed, payments towards it in `sale_collections`, `updated_at` on sales
so a list refresh sees a bill whose balance changed, and `balance_off` on returns (the part of a return that paid
off a credit bill instead of being refunded).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('balance', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False))
    op.add_column(
        'sales',
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.execute('UPDATE sales SET updated_at = created_at')
    op.create_index(op.f('ix_sales_updated_at'), 'sales', ['updated_at'], unique=False)
    op.add_column(
        'sale_returns',
        sa.Column('balance_off', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
    )
    op.create_table(
        'sale_collections',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('receipt_no', sa.String(length=32), nullable=False),
        sa.Column('sale_id', sa.Uuid(), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('payment', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_by', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(
            ['location_id'], ['locations.id'], name=op.f('fk_sale_collections_location_id_locations')
        ),
        sa.ForeignKeyConstraint(
            ['sale_id'], ['sales.id'], name=op.f('fk_sale_collections_sale_id_sales'), ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sale_collections')),
        sa.UniqueConstraint('receipt_no', name=op.f('uq_sale_collections_receipt_no')),
    )
    op.create_index(op.f('ix_sale_collections_at'), 'sale_collections', ['at'], unique=False)
    op.create_index(op.f('ix_sale_collections_location_id'), 'sale_collections', ['location_id'], unique=False)
    op.create_index(op.f('ix_sale_collections_sale_id'), 'sale_collections', ['sale_id'], unique=False)


def downgrade() -> None:
    op.drop_table('sale_collections')
    op.drop_column('sale_returns', 'balance_off')
    op.drop_index(op.f('ix_sales_updated_at'), table_name='sales')
    op.drop_column('sales', 'updated_at')
    op.drop_column('sales', 'balance')
