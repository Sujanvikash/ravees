"""Sign-ins: every time a login signs in, kept for the admin's Sign-ins page with when, from which address and
device, and when it was signed out (or its password changed). Sign-ins before this aren't known.

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-15
"""

import sqlalchemy as sa
from alembic import op

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sign_ins',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('username', sa.String(32), nullable=False),
        sa.Column('location_id', sa.String(32), nullable=True),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended', sa.String(16), nullable=True),
        sa.Column('address', sa.String(64), nullable=False),
        sa.Column('device', sa.String(300), nullable=False),
    )
    op.create_index('ix_sign_ins_username', 'sign_ins', ['username'])
    op.create_index('ix_sign_ins_at', 'sign_ins', ['at'])


def downgrade() -> None:
    op.drop_table('sign_ins')
