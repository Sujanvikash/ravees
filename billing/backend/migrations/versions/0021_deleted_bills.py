"""Bills deleted after they were made: each is kept in deleted_sales as it was, with who deleted it and when, and
the bill itself is gone from sales (its number is not handed out again).

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-26

The passwords for editing and deleting a bill, a discount and the Demo switch, which the admin now sets, are kept in
app_settings and need no table of their own.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0021'
down_revision = '0020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'deleted_sales',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('bill_no', sa.String(length=32), nullable=False),
        sa.Column('location_id', sa.String(length=32), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_by', sa.String(length=32), nullable=False),
        sa.Column('sale', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], name=op.f('fk_deleted_sales_location_id_locations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_deleted_sales')),
        sa.UniqueConstraint('bill_no', name=op.f('uq_deleted_sales_bill_no')),
    )
    op.create_index(op.f('ix_deleted_sales_deleted_at'), 'deleted_sales', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_deleted_sales_location_id'), 'deleted_sales', ['location_id'], unique=False)


def downgrade() -> None:
    op.drop_table('deleted_sales')
