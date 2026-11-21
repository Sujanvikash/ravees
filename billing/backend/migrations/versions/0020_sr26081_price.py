"""SR26081 (HAND CRAFTED DEER SML) sells at 180 with an MRP of 225, as the client confirmed (21 Nov 2026): the list
has MRP 80 and S.Price 70. One product list serves every showroom, so it is the new price everywhere. Its cost
(D.Rate 67.46), GST, HSN and stock stay as they are.

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-21

Only a product still at the list's 80 / 70 is changed: a database seeded from the corrected product Excel already
has the new price. Past bills, quotations and invoices keep what they were made with. Downgrade puts back 80 / 70
if the product is still at 225 / 180.
"""

import sqlalchemy as sa
from alembic import op

revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None

CODE = 'SR26081'
WAS = (80, 70)  # MRP, selling price on the list
NOW = (225, 180)  # MRP, selling price as the client confirmed


def _reprice(frm: tuple[int, int], to: tuple[int, int]) -> None:
    op.get_bind().execute(
        sa.text(
            'UPDATE products SET mrp = :mrp, offer = :offer, updated_at = now() '
            'WHERE code = :code AND mrp = :was_mrp AND offer = :was_offer'
        ),
        {'code': CODE, 'mrp': to[0], 'offer': to[1], 'was_mrp': frm[0], 'was_offer': frm[1]},
    )


def upgrade() -> None:
    _reprice(WAS, NOW)


def downgrade() -> None:
    _reprice(NOW, WAS)
