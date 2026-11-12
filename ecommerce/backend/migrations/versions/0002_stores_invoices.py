"""store exclusives, HSN per category, invoices on orders; the five categories and the new stores

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-12 12:00:00

The tables: products.store_only, categories.hsn, and an order's invoice (invoice_no, invoiced_at, seller).

Then, on a shop that already has a catalogue (the live one; a new shop gets all this from `seed`):
- the categories become the five the shop sells: Trees, Lights, Baubles, Décor Items, Wreath & Garlands. Santa
  toys, nativity sets and home decor move into Décor Items; any other category is hidden.
- each category shows at most 10 products: the chosen ones first, the rest of each category is hidden (kept for
  the admin, never deleted).
- the stores are replaced by the eight in seed/catalogue.json, with their photos from seed/images.
"""

import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core import clock
from app.core.config import BACKEND_DIR
from app.modules.catalogue import images

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: str | Sequence[str] | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MAX_PER_CATEGORY = 10

# (id, name, icon, hsn, the old categories it takes over, the products it shows first)
CATEGORIES = [
    ('trees', 'Trees', '🎄', '9505', ['christmas-trees'], []),
    ('lights', 'Lights', '✨', '9405', ['christmas-lights'], []),
    ('baubles', 'Baubles', '🔮', '9505', ['tree-hangings'], [f'wonderland-ornaments-{n}' for n in range(1, 11)]),
    (
        'decor-items',
        'Décor Items',
        '🎅',
        '9505',
        ['home-decors', 'santa-toy', 'nativity-sets'],
        [
            'santa-doll-1',
            'cribsets-1',
            'santa-doll-deer-toy-1',
            'cribsets-2',
            'santa-toy-1',
            'santa-doll-snow-man1',
            'cribsets-3',
            'santa-doll-2',
            'santa-toy-3',
            'santa-toy-2',
        ],
    ),
    ('wreath-garlands', 'Wreath & Garlands', '🌿', '9505', ['wreath-garlands'], []),
]


def upgrade() -> None:
    op.add_column('products', sa.Column('store_only', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('categories', sa.Column('hsn', sa.String(length=8), server_default='', nullable=False))
    op.add_column('orders', sa.Column('invoice_no', sa.String(length=24), nullable=True))
    op.add_column('orders', sa.Column('invoiced_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('seller', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_unique_constraint(op.f('uq_orders_invoice_no'), 'orders', ['invoice_no'])

    db = op.get_bind()
    if db.scalar(sa.text('SELECT count(*) FROM categories')):
        _five_categories(db)
        _new_stores(db)


def _five_categories(db: sa.Connection) -> None:
    old = {row.id: row for row in db.execute(sa.text('SELECT id, image_id FROM categories'))}
    new_ids = [c[0] for c in CATEGORIES]
    for position, (cid, name, icon, hsn, takes, _) in enumerate(CATEGORIES, start=1):
        image_id = next((old[o].image_id for o in [cid, *takes] if o in old and old[o].image_id), None)
        db.execute(
            sa.text(
                'INSERT INTO categories (id, name, icon, image_id, position, visible, hsn) '
                'VALUES (:id, :name, :icon, :image_id, :position, true, :hsn) '
                'ON CONFLICT (id) DO UPDATE SET name = :name, icon = :icon, image_id = :image_id, '
                'position = :position, visible = true, hsn = :hsn'
            ),
            {'id': cid, 'name': name, 'icon': icon, 'image_id': image_id, 'position': position, 'hsn': hsn},
        )
        moved = [o for o in takes if o != cid]
        if moved:
            db.execute(
                sa.text('UPDATE products SET category_id = :id WHERE category_id IN :old').bindparams(
                    sa.bindparam('old', expanding=True)
                ),
                {'id': cid, 'old': moved},
            )
    # the old categories, now empty, go; any other one (made by the admin) is only hidden
    taken = [o for c in CATEGORIES for o in c[4] if o not in new_ids]
    if taken:
        db.execute(
            sa.text(
                'DELETE FROM categories c WHERE c.id IN :ids AND NOT EXISTS '
                '(SELECT 1 FROM products p WHERE p.category_id = c.id)'
            ).bindparams(sa.bindparam('ids', expanding=True)),
            {'ids': taken},
        )
    db.execute(
        sa.text('UPDATE categories SET visible = false WHERE id NOT IN :ids').bindparams(
            sa.bindparam('ids', expanding=True)
        ),
        {'ids': new_ids},
    )

    # at most 10 shown per category, the chosen ones first; products keep one running order across the shop
    position = 0
    for cid, *_, first in CATEGORIES:
        rows = db.execute(
            sa.text('SELECT id, visible FROM products WHERE category_id = :id ORDER BY position, name'), {'id': cid}
        ).all()
        rank = {pid: i for i, pid in enumerate(first)}
        rows.sort(key=lambda row: rank.get(row.id, len(first)))
        shown = 0
        for row in rows:
            position += 1
            visible = row.visible and shown < MAX_PER_CATEGORY
            shown += visible
            db.execute(
                sa.text('UPDATE products SET position = :position, visible = :visible WHERE id = :id'),
                {'position': position, 'visible': visible, 'id': row.id},
            )


def _photo(db: sa.Connection, name: str) -> str:
    processed = images.process((BACKEND_DIR / 'seed' / 'images' / name).read_bytes())
    image_id = uuid.uuid4()
    db.execute(
        sa.text(
            'INSERT INTO images (id, large, card, width, height, created_at) '
            'VALUES (:id, :large, :card, :width, :height, :at)'
        ),
        {
            'id': image_id,
            'large': processed.large,
            'card': processed.card,
            'width': processed.width,
            'height': processed.height,
            'at': clock.now(),
        },
    )
    return str(image_id)


def _new_stores(db: sa.Connection) -> None:
    seed = json.loads((BACKEND_DIR / 'seed' / 'catalogue.json').read_text(encoding='utf-8'))
    db.execute(sa.text('DELETE FROM showrooms'))
    for position, s in enumerate(seed['showrooms'], start=1):
        stores = [
            {
                'name': store['name'],
                'address': store.get('address', ''),
                'phone': store.get('phone', ''),
                'timing': store.get('timing', ''),
                'map_url': store.get('mapUrl', ''),
                'image_ids': [_photo(db, name) for name in store.get('images', [])],
            }
            for store in s.get('stores', [])
        ]
        db.execute(
            sa.text(
                'INSERT INTO showrooms (id, city, is_flagship, title, address, phone, timing, features, map_query, '
                'stores, position) VALUES (:id, :city, :flagship, :title, :address, :phone, :timing, '
                'CAST(:features AS jsonb), :map_query, CAST(:stores AS jsonb), :position)'
            ),
            {
                'id': uuid.uuid4(),
                'city': s['city'],
                'flagship': bool(s.get('isFlagship')),
                'title': s.get('title', ''),
                'address': s.get('address', ''),
                'phone': s.get('phone', ''),
                'timing': s.get('timing', ''),
                'features': json.dumps(s.get('features', [])),
                'map_query': s.get('mapQuery', ''),
                'stores': json.dumps(stores),
                'position': position,
            },
        )


def downgrade() -> None:
    op.drop_constraint(op.f('uq_orders_invoice_no'), 'orders', type_='unique')
    op.drop_column('orders', 'seller')
    op.drop_column('orders', 'invoiced_at')
    op.drop_column('orders', 'invoice_no')
    op.drop_column('categories', 'hsn')
    op.drop_column('products', 'store_only')
