"""The invoice's own PDF, made once when it is raised (and again only when its colours or look change, or it is
edited), so its preview opens at once instead of being drawn again every time.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-12

pdf_stamp says what the kept PDF was made in ('evergreen:band'…); empty when none is kept yet (every invoice raised
before this makes its own the first time it is previewed).
"""

import sqlalchemy as sa
from alembic import op

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('transfer_invoices', sa.Column('pdf_data', sa.LargeBinary(), nullable=True))
    op.add_column('transfer_invoices', sa.Column('pdf_stamp', sa.String(64), nullable=False, server_default=''))


def downgrade() -> None:
    op.drop_column('transfer_invoices', 'pdf_stamp')
    op.drop_column('transfer_invoices', 'pdf_data')
