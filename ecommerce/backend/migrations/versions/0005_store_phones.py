"""one phone number for each store: Chennai - Egmore, Chennai - ECR and Kochi

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-25 16:00:00

The client's numbers (25 Nov 2026), one each: Egmore 73388 20077 (as on its Google Business profile), ECR
73399 20077 and Kochi 86956 68005. Chennai's own number (shown for a store without one) becomes Egmore's, Kochi's
its store's. Only a number still at the old one changes, so one already edited in the admin stays as it is; downgrade
puts back the old ones the same way.
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: str | Sequence[str] | None = '0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHENNAI_WAS = '+91 97516 65555 / +91 73388 20077'
KOCHI_WAS = '+91 98408 49124 / +91 98956 41663'
EGMORE = '+91 73388 20077'
ECR = '+91 73399 20077'
KOCHI = '+91 86956 68005'

# city: (the city's own number, {store name: number}), each as (old, new)
PHONES = {
    'Chennai': ((CHENNAI_WAS, EGMORE), {'Egmore': (CHENNAI_WAS, EGMORE), 'ECR': (CHENNAI_WAS, ECR)}),
    'Kochi': ((KOCHI_WAS, KOCHI), {'Kacheripady': (KOCHI_WAS, KOCHI)}),
}


def _change(back: bool) -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text('SELECT id, city, phone, stores FROM showrooms WHERE city IN :cities').bindparams(
            sa.bindparam('cities', expanding=True)
        ),
        {'cities': list(PHONES)},
    ).all()
    for id_, city, phone, stores in rows:
        own, per_store = PHONES[city]
        frm, to = (own[1], own[0]) if back else own
        new_phone = to if phone == frm else phone
        new_stores = []
        for store in stores or []:
            pair = per_store.get(store.get('name'))
            if pair:
                frm, to = (pair[1], pair[0]) if back else pair
                if store.get('phone') == frm:
                    store = {**store, 'phone': to}
            new_stores.append(store)
        if new_phone != phone or new_stores != (stores or []):
            bind.execute(
                sa.text('UPDATE showrooms SET phone = :phone, stores = CAST(:stores AS jsonb) WHERE id = :id'),
                {'id': id_, 'phone': new_phone, 'stores': json.dumps(new_stores, ensure_ascii=False)},
            )


def upgrade() -> None:
    _change(back=False)


def downgrade() -> None:
    _change(back=True)
