"""Hyderabad (Jubilee Hills, bill prefix HYD) joins as the sixth showroom, with its login: hyderabad, password
hyderabad@2026 until it is changed. Its own details on its bills (SANTA SIGNATURE, GSTIN 36MICPS1685R1Z3,
Telangana) are the built-in ones in the frontend's src/config.js, and can be changed under Settings → Showrooms.

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-12

Nothing is added where a store already has the id or the HYD prefix (one added by hand on the Stores page keeps its
own). Downgrade leaves the store in place, as removing a store is the Stores page's job.
"""

import sqlalchemy as sa
from alembic import op

from app.core.security import default_password, hash_password

revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

STORE = {'id': 'hyderabad', 'city': 'Hyderabad', 'area': 'Jubilee Hills', 'prefix': 'HYD'}


def upgrade() -> None:
    conn = op.get_bind()
    taken = conn.execute(
        sa.text('SELECT 1 FROM locations WHERE id = :id OR bill_prefix = :prefix'),
        {'id': STORE['id'], 'prefix': STORE['prefix']},
    ).first()
    if not taken:
        conn.execute(
            sa.text(
                'INSERT INTO locations (id, city, area, bill_prefix, next_product_no, active) '
                'VALUES (:id, :city, :area, :prefix, 1, true)'
            ),
            STORE,
        )
    ours = conn.execute(sa.text('SELECT 1 FROM locations WHERE id = :id'), {'id': STORE['id']}).first()
    login = conn.execute(sa.text('SELECT 1 FROM users WHERE username = :id'), {'id': STORE['id']}).first()
    if ours and not login:
        conn.execute(
            sa.text(
                "INSERT INTO users (username, role, location_id, password_hash) VALUES (:id, 'location', :id, :hash)"
            ),
            {'id': STORE['id'], 'hash': hash_password(default_password(STORE['id']))},
        )


def downgrade() -> None:
    pass
