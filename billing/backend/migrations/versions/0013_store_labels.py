"""Stores that share a city are named by city and area in what was already recorded: "Chennai" in the history of a
Palavakkam order becomes "Chennai Palavakkam", and in an Egmore one "Chennai Egmore" (Location.label).

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-11

Covers who did what in purchase orders, purchase returns, stock imports, shop products and quotations, and the
"ICC000008 to Chennai" notes in box history. Only data changes; downgrade leaves the new names in place.
"""

from collections import Counter

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def _set_history(conn: sa.Connection, table: str, row_id: object, history: list[dict]) -> None:
    stmt = sa.text(f'UPDATE {table} SET history = :history WHERE id = :id').bindparams(
        sa.bindparam('history', type_=JSONB)
    )
    conn.execute(stmt, {'history': history, 'id': row_id})


def upgrade() -> None:
    conn = op.get_bind()
    stores = conn.execute(sa.text('SELECT id, city, area FROM locations')).all()
    count = Counter(s.city for s in stores)
    shared = {s.id: (s.city, f'{s.city} {s.area}') for s in stores if count[s.city] > 1}  # id: (old, new)
    if not shared:
        return

    for table in ('purchase_orders', 'stock_returns'):
        for row in conn.execute(sa.text(f'SELECT id, location_id, history FROM {table}')).all():
            if row.location_id not in shared:
                continue
            city, label = shared[row.location_id]
            history = [{**e, 'by': label} if e.get('by') == city else e for e in row.history]
            if history != row.history:
                _set_history(conn, table, row.id, history)

    for location_id, (city, label) in shared.items():
        names = {'id': location_id, 'city': city, 'label': label}
        conn.execute(sa.text('UPDATE stock_imports SET by = :label WHERE location_id = :id AND by = :city'), names)
        conn.execute(sa.text('UPDATE quotes SET by = :label WHERE location_id = :id AND by = :city'), names)
        conn.execute(
            sa.text('UPDATE products SET created_by = :label WHERE shop_location_id = :id AND created_by = :city'),
            names,
        )

    # a box's "ICC000008 to Chennai": the invoice number says which store
    invoiced = dict(conn.execute(sa.text('SELECT number, location_id FROM transfer_invoices')).all())
    for row in conn.execute(sa.text('SELECT id, history FROM boxes')).all():
        history = []
        for e in row.history:
            number, _, city = e.get('note', '').partition(' to ')
            store = shared.get(invoiced.get(number))
            history.append({**e, 'note': f'{number} to {store[1]}'} if store and city == store[0] else e)
        if history != row.history:
            _set_history(conn, 'boxes', row.id, history)


def downgrade() -> None:
    pass
