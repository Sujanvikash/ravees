"""The admin's own stock: a 'warehouse' location next to the five showrooms.

Stock sent back by the showrooms goes into it when the admin counts it in, the admin adds to it from an Excel or by
hand, and purchase orders sent to the showrooms come out of it. No new table: it is a row in locations, so stock
levels and imports work as they do for a showroom.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-27
"""

import sqlalchemy as sa
from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO locations (id, city, area, bill_prefix) VALUES ('warehouse', 'Admin', 'Warehouse', 'ADM') "
            'ON CONFLICT (id) DO NOTHING'
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM stock_levels WHERE location_id = 'warehouse'"))
    op.execute(sa.text("DELETE FROM stock_imports WHERE location_id = 'warehouse'"))
    op.execute(sa.text("DELETE FROM number_series WHERE location_id = 'warehouse'"))
    op.execute(sa.text("DELETE FROM locations WHERE id = 'warehouse'"))
