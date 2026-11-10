"""
Builds the demo schema from nothing: the tables, the showrooms and logins, the catalogue from the product Excel with
its season, and the admin's own stock of the season's products (seed/admin-stock-2026.xlsx, imported the way the
admin imports it on the live server). Nothing else: no showroom stock, sales, customers, orders, quotations or cash
closes, so the demo starts where the real data does and every workflow can be tried from its first step.
"""

import hashlib
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import inspect, text

from app import db_models  # noqa: F401  (registers every table)
from app.core.database import DEMO_SCHEMA, Base, get_demo_engine, get_engine, get_session_factory
from app.modules.locations import repository as locations
from app.modules.products import repository as products
from app.modules.products import service as products_service
from app.modules.products.importer import DEFAULT_EXCEL, read_catalogue
from app.modules.stock.importer import ADMIN_STOCK, import_admin_stock
from app.modules.system import repository as app_settings
from app.modules.users import service as users_service

SEED_KEY = 'demo_seed'  # in the demo's own app_settings: seed_fingerprint() of what it was built from
BUILD = 'clean-2'  # what the demo holds; change it when that changes, so the server builds the demo again on start


@dataclass(frozen=True, slots=True)
class DemoReport:
    products: int
    in_season: int
    season: str
    admin_units: int

    def __str__(self) -> str:
        return (
            f'Demo ready: 5 showrooms and the admin, {self.products} products ({self.in_season} in Season '
            f'{self.season}), {self.admin_units:,} units in the admin stock, nothing sold yet.'
        )


def demo_exists() -> bool:
    with get_engine().connect() as conn:
        return bool(
            conn.scalar(
                text("select 1 from information_schema.tables where table_schema = :s and table_name = 'users'"),
                {'s': DEMO_SCHEMA},
            )
        )


def seed_fingerprint(excel: Path = DEFAULT_EXCEL) -> str:
    """A hash of what the demo is built from: the product Excel, the admin's stock sheet, and BUILD."""
    stock = ADMIN_STOCK.read_bytes() if ADMIN_STOCK.exists() else b''
    return hashlib.sha256(BUILD.encode() + excel.read_bytes() + stock).hexdigest()


def demo_is_current() -> bool:
    """Whether the demo schema has every table and column the models now have, and was built from the product
    Excel and the admin's stock sheet as they are now. The demo isn't migrated (it is built from the models and the
    files), so after a deploy that changes a model, the product list or the stock sheet it falls behind until it is
    built again."""
    inspector = inspect(get_engine())
    if DEMO_SCHEMA not in inspector.get_schema_names():
        return False
    have = set(inspector.get_table_names(schema=DEMO_SCHEMA))
    for table in Base.metadata.sorted_tables:
        if table.name not in have:
            return False
        columns = {c['name'] for c in inspector.get_columns(table.name, schema=DEMO_SCHEMA)}
        if not {c.name for c in table.columns} <= columns:
            return False
    with get_session_factory(demo=True)() as session:
        return app_settings.get_value(session, SEED_KEY) == seed_fingerprint()


def _recreate_schema() -> None:
    with get_engine().begin() as conn:
        conn.execute(text(f'DROP SCHEMA IF EXISTS {DEMO_SCHEMA} CASCADE'))
        conn.execute(text(f'CREATE SCHEMA {DEMO_SCHEMA}'))
    with get_demo_engine().begin() as conn:
        Base.metadata.create_all(conn)


def build_demo(excel: Path = DEFAULT_EXCEL) -> DemoReport:
    """Throws away the demo schema, if there is one, and builds it again: showrooms, logins, the catalogue and the
    admin's stock."""
    catalogue = read_catalogue(excel)
    _recreate_schema()
    with get_session_factory(demo=True)() as session:
        locations.add_missing_showrooms(session)
        users_service.add_missing_logins(session)
        products_service.import_catalogue(session, catalogue, season_from_excel=True)
        app_settings.set_value(session, SEED_KEY, seed_fingerprint(excel))
        session.commit()

        units = import_admin_stock(session, ADMIN_STOCK)[0] if ADMIN_STOCK.exists() else 0
        return DemoReport(
            products=products.count(session),
            in_season=products.count(session, in_season_only=True),
            season=catalogue.season,
            admin_units=units,
        )
