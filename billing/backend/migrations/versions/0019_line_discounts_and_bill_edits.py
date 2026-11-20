"""A discount on single products of a bill (sale_lines.off, rupees off the line), and bills edited after they
were made: sales.edits keeps each version an edit replaced.

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-21
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sale_lines', sa.Column('off', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False))
    op.add_column(
        'sales', sa.Column('edits', postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False)
    )


def downgrade() -> None:
    op.drop_column('sales', 'edits')
    op.drop_column('sale_lines', 'off')
