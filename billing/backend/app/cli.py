"""
Commands for running the billing API.

    uv run python -m app.cli seed                          # showrooms, logins and products (and the demo)
    uv run python -m app.cli seed --season-from-excel      # also reset "in season" to the Excel's column
    uv run python -m app.cli seed --excel path/to/file.xlsx
    uv run python -m app.cli seed --admin-stock                # also the season's stock into the admin stock, once
    uv run python -m app.cli demo                          # build the demo again from scratch
    uv run python -m app.cli refresh-demo                  # build it only if it is missing or out of date

seed fills the database: the five showrooms, a login for each plus the admin (default passwords), and the
product catalogue from seed/products-clean.xlsx. Safe to run again: it never changes a password, and it keeps
the admin's season choices unless --season-from-excel is given. If there is no demo yet it builds one too
(--no-demo to skip). --admin-stock also imports the season's stock sheet (seed/admin-stock-2026.xlsx) into the
admin's own stock, as Inventory -> Import stock would; the same sheet is only ever added once.

demo throws everything done in the demo away and builds it again clean: the showrooms, logins, catalogue and the
admin's stock of the season, with no sales. The real data is never touched.

refresh-demo is what the server runs on every start: it builds the demo only when there is none, or when a deploy
changed the models so its tables no longer match, or changed the product Excel it was built from.
It never fails the start (a broken demo must not stop the API).
"""

import argparse
import dataclasses
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from app import db_models  # noqa: F401  (registers every table, so relationships resolve)
from app.core.config import get_settings
from app.core.database import get_session_factory, session_scope
from app.modules.demo import builder as demo_builder
from app.modules.locations import repository as locations
from app.modules.products import repository as products
from app.modules.products import service as products_service
from app.modules.products.importer import DEFAULT_EXCEL, CatalogueFileError, read_catalogue
from app.modules.stock.importer import ADMIN_STOCK, import_admin_stock
from app.modules.users import service as users_service


@dataclass(frozen=True, slots=True)
class SeedReport:
    showrooms_added: int
    logins_added: int
    products_in_excel: int
    products_total: int
    products_in_season: int
    season: str
    admin_stock: str = ''  # what --admin-stock did

    def __str__(self) -> str:
        return (
            f'{self.showrooms_added} new showrooms, {self.logins_added} new logins, '
            f'{self.products_in_excel} products from the Excel '
            f'({self.products_total} in the catalogue, {self.products_in_season} in Season {self.season}).'
            f'{self.admin_stock}'
        )


def seed(
    *, season_from_excel: bool = False, excel: Path = DEFAULT_EXCEL, admin_stock: Path | None = None
) -> SeedReport:
    """Fills the database in one transaction: nothing is saved if any step fails. With `admin_stock`, that sheet is
    then added to the admin's own stock (in a second transaction, once the products it names are in)."""
    catalogue = read_catalogue(excel)
    with session_scope() as session:
        showrooms_added = locations.add_missing_showrooms(session)
        logins_added = users_service.add_missing_logins(session)
        products_service.import_catalogue(session, catalogue, season_from_excel=season_from_excel)
        report = SeedReport(
            showrooms_added=showrooms_added,
            logins_added=logins_added,
            products_in_excel=len(catalogue.products),
            products_total=products.count(session),
            products_in_season=products.count(session, in_season_only=True),
            season=catalogue.season,
        )
    if admin_stock:
        with get_session_factory()() as session:
            units, added = import_admin_stock(session, admin_stock)
        done = 'added to the admin stock' if added else 'already in the admin stock, so nothing was added'
        report = dataclasses.replace(report, admin_stock=f' {admin_stock.name}: {units:,} units {done}.')
    return report


def refresh_demo() -> None:
    """Builds the demo when it is missing or out of date, else leaves it (and its data) alone. Any error is
    printed and swallowed: this runs as the API starts."""
    if not get_settings().demo_enabled:
        print('Demo is switched off.')
        return
    try:
        if demo_builder.demo_is_current():
            print('Demo is up to date.')
        else:
            print('Demo is missing or out of date; building it.')
            print(demo_builder.build_demo())
    except Exception as error:  # noqa: BLE001  (a broken demo must not stop the API)
        print(f'Could not build the demo: {error}', file=sys.stderr)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='python -m app.cli', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    commands = parser.add_subparsers(dest='command', required=True)
    seed_cmd = commands.add_parser('seed', help='fill the database: showrooms, logins and the product catalogue')
    seed_cmd.add_argument('--season-from-excel', action='store_true', help='reset "in season" to the Excel column')
    seed_cmd.add_argument(
        '--excel', type=Path, default=DEFAULT_EXCEL, help=f'the product Excel (default: {DEFAULT_EXCEL})'
    )
    seed_cmd.add_argument('--no-demo', action='store_true', help="don't build the demo when there isn't one")
    seed_cmd.add_argument(
        '--admin-stock',
        nargs='?',
        const=ADMIN_STOCK,
        type=Path,
        help=f'also add a stock sheet to the admin stock, once (default: {ADMIN_STOCK.name})',
    )
    commands.add_parser('demo', help='build the demo (kept apart from the real data) again from scratch, clean')
    commands.add_parser(
        'refresh-demo', help='build the demo only if it is missing or behind the models or the product Excel'
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == 'seed':
            print(seed(season_from_excel=args.season_from_excel, excel=args.excel, admin_stock=args.admin_stock))
            if not args.no_demo and not demo_builder.demo_exists():
                print(demo_builder.build_demo(args.excel))
        elif args.command == 'demo':
            print(demo_builder.build_demo())
        elif args.command == 'refresh-demo':
            refresh_demo()
    except (CatalogueFileError, FileNotFoundError) as error:
        print(f'Could not read the product Excel: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
