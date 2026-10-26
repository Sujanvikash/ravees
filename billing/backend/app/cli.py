"""
Commands for running the billing API.

    uv run python -m app.cli seed                          # showrooms, logins and products
    uv run python -m app.cli seed --season-from-excel      # also reset "in season" to the Excel's column
    uv run python -m app.cli seed --excel path/to/file.xlsx

seed fills the database: the five showrooms, a login for each plus the admin (default passwords), and the
product catalogue from seed/products-clean.xlsx. Safe to run again: it never changes a password, and it keeps
the admin's season choices unless --season-from-excel is given.
"""

import argparse
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from app import db_models  # noqa: F401  (registers every table, so relationships resolve)
from app.core.database import session_scope
from app.modules.locations import repository as locations
from app.modules.products import repository as products
from app.modules.products import service as products_service
from app.modules.products.importer import DEFAULT_EXCEL, CatalogueFileError, read_catalogue
from app.modules.users import service as users_service


@dataclass(frozen=True, slots=True)
class SeedReport:
    showrooms_added: int
    logins_added: int
    products_in_excel: int
    products_total: int
    products_in_season: int
    season: str

    def __str__(self) -> str:
        return (
            f'{self.showrooms_added} new showrooms, {self.logins_added} new logins, '
            f'{self.products_in_excel} products from the Excel '
            f'({self.products_total} in the catalogue, {self.products_in_season} in Season {self.season}).'
        )


def seed(*, season_from_excel: bool = False, excel: Path = DEFAULT_EXCEL) -> SeedReport:
    """Fills the database in one transaction: nothing is saved if any step fails."""
    catalogue = read_catalogue(excel)
    with session_scope() as session:
        showrooms_added = locations.add_missing_showrooms(session)
        logins_added = users_service.add_missing_logins(session)
        products_service.import_catalogue(session, catalogue, season_from_excel=season_from_excel)
        return SeedReport(
            showrooms_added=showrooms_added,
            logins_added=logins_added,
            products_in_excel=len(catalogue.products),
            products_total=products.count(session),
            products_in_season=products.count(session, in_season_only=True),
            season=catalogue.season,
        )


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
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == 'seed':
        try:
            report = seed(season_from_excel=args.season_from_excel, excel=args.excel)
        except (CatalogueFileError, FileNotFoundError) as error:
            print(f'Could not read the product Excel: {error}', file=sys.stderr)
            return 1
        print(report)
    return 0


if __name__ == '__main__':
    sys.exit(main())
