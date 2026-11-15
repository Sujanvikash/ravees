"""15 products of Season 2026 were priced by the box but are sold by the piece ("CHNAGES TO SINGLE PICS.pdf", 15 Nov
2026). Each keeps its code and gets the list's MRP, selling price and D.Rate (the dealer's price, its cost); the
stock everywhere it is held (the admin's and every showroom's) is multiplied by the old selling price over the new one,
to the nearest whole piece: 80 at 1,480 become 2,960 at 40. Each place's change is kept as a stock record ("Boxes to
pieces") for the inventory history. An invoice not yet added to a showroom's stock (raised or paid) keeps its printed
lines, and each of these products' lines gets stock_qty, the pieces it brings into the showroom's stock (or back to
the admin's if it is cancelled): FD26021 x 5 brings 185.

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-15

A product whose selling price isn't the old one any more (a database seeded from the corrected product Excel) is left
as it is. Past bills, orders, boxes and invoices already stocked or cancelled keep what they were made with.
Downgrade changes nothing: rounded pieces can't be turned back into boxes exactly.
"""

import uuid
from decimal import ROUND_HALF_UP, Decimal

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None

# (code, old selling price, MRP, selling price, D.Rate), the new prices as on the list
PIECES = (
    ('FD26021', 1480, 50, 40, 10),
    ('FD26022', 3950, 70, 50, 10),
    ('FD26023', 1480, 60, 40, 10),
    ('FD26024', 1480, 120, 80, 10),
    ('FD26025', 3750, 90, 80, 10),
    ('FD26026', 1850, 50, 40, 10),
    ('FD26027', 2950, 90, 60, 10),
    ('FD26028', 4150, 70, 60, 10),
    ('FD26029', 2450, 70, 60, 10),
    ('FD26032', 270, 350, 270, 10),
    ('FD26033', 2300, 60, 50, 10),
    ('FD26034', 1980, 70, 60, 10),
    ('FD26035', 1600, 80, 70, 10),
    ('FD26061', 2450, 320, 235, 15),
    ('SR26113', 1800, 220, 150, 20),
)
FILE = 'New price list: boxes to pieces'
SOURCE = 'pieces'


def pieces(qty: int, was: int, now: int) -> int:
    """Units at the old selling price as units at the new one, to the nearest whole piece."""
    return int((Decimal(qty) * was / now).quantize(Decimal(1), ROUND_HALF_UP))


stock_imports = sa.table(
    'stock_imports',
    sa.column('id', sa.Uuid),
    sa.column('at', sa.DateTime(timezone=True)),
    sa.column('location_id', sa.String),
    sa.column('by', sa.String),
    sa.column('username', sa.String),
    sa.column('file', sa.String),
    sa.column('source', sa.String),
    sa.column('lines', JSONB),
)
transfer_invoices = sa.table('transfer_invoices', sa.column('id', sa.Uuid), sa.column('lines', JSONB))


def upgrade() -> None:
    conn = op.get_bind()
    changed: dict[str, list[dict]] = {}  # place -> the units each product gained
    factor: dict[str, tuple[int, int]] = {}  # code -> (old selling price, new) of each product changed
    for code, was, mrp, offer, cost in PIECES:
        product = conn.execute(
            sa.text('SELECT name, mrp, offer FROM products WHERE code = :code'), {'code': code}
        ).first()
        if not product or (product.offer or product.mrp) != was:
            continue
        conn.execute(
            sa.text(
                'UPDATE products SET mrp = :mrp, offer = :offer, cost = :cost, updated_at = now() WHERE code = :code'
            ),
            {'code': code, 'mrp': mrp, 'offer': offer, 'cost': cost},
        )
        if offer != was:
            factor[code] = (was, offer)
        levels = conn.execute(sa.text('SELECT location_id, qty FROM stock_levels WHERE code = :code'), {'code': code})
        for place, qty in levels.all():
            now = pieces(qty, was, offer)
            if now == qty:
                continue
            conn.execute(
                sa.text('UPDATE stock_levels SET qty = :qty WHERE location_id = :place AND code = :code'),
                {'qty': now, 'place': place, 'code': code},
            )
            changed.setdefault(place, []).append({'code': code, 'name': product.name, 'qty': now - qty, 'rate': cost})
    for place, lines in changed.items():
        conn.execute(
            stock_imports.insert().values(
                id=uuid.uuid5(uuid.NAMESPACE_URL, f'raaves-billing/0017/{place}'),
                at=sa.func.now(),
                location_id=place,
                by='Admin',
                username='admin',
                file=FILE,
                source=SOURCE,
                lines=lines,
            )
        )
    open_invoices = conn.execute(sa.text("SELECT id, lines FROM transfer_invoices WHERE status IN ('raised', 'paid')"))
    for invoice_id, lines in open_invoices.all():
        if not any(line['code'] in factor and 'stock_qty' not in line for line in lines):
            continue
        for line in lines:
            if line['code'] in factor and 'stock_qty' not in line:
                line['stock_qty'] = pieces(line['qty'], *factor[line['code']])
        conn.execute(transfer_invoices.update().where(transfer_invoices.c.id == invoice_id).values(lines=lines))


def downgrade() -> None:
    pass
