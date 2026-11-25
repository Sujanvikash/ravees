"""every product out of stock: the website is view only until the real products and prices are in

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-25 17:00:00

The products on the website are test items with made-up prices. With www.christmasraave.in live (25 Nov 2026) nobody
should buy them, so each is marked out of stock: the website shows it without a price and the checkout refuses it. A
product goes back on sale from the admin (Products → the product → In stock). Downgrade changes nothing: which
products were in stock before isn't kept.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0006'
down_revision: str | Sequence[str] | None = '0005'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('UPDATE products SET in_stock = false WHERE in_stock')


def downgrade() -> None:
    pass
