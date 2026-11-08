"""Product pictures for quotations: a small JPEG (a data: URL) on the product.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-08
"""

import sqlalchemy as sa
from alembic import op

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('image', sa.Text(), nullable=True))
    op.add_column('products', sa.Column('has_image', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('products', 'has_image')
    op.drop_column('products', 'image')
