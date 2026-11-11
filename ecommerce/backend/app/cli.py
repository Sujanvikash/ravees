"""
Commands for running the shop API.

    uv run python -m app.cli seed        # the admin login and, the first time, the starting catalogue

seed makes the admin login (ADMIN_USERNAME / ADMIN_PASSWORD; without a password one is made up and printed) when
there is none, and never changes one that exists. On an empty shop it also loads the starting catalogue from
seed/catalogue.json (the old website's categories, products, showrooms and testimonials) with its photos from
seed/images; once the shop has categories it leaves the catalogue alone, so the admin's edits are safe. Products
start without prices ("Enquire for price"): the admin adds them.
"""

import argparse
import json
import secrets
import sys
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy import func, select

from app import db_models  # noqa: F401  (registers every table, so relationships resolve)
from app.core import clock
from app.core.config import BACKEND_DIR, get_settings
from app.core.database import session_scope
from app.modules.accounts import service as accounts
from app.modules.catalogue import images
from app.modules.catalogue.models import Category, Image, Product
from app.modules.site.models import Showroom, Testimonial

SEED_DIR = BACKEND_DIR / 'seed'


def _photo(session, folder: Path, name: str, at) -> str:
    processed = images.process((folder / name).read_bytes())
    image = Image(
        large=processed.large, card=processed.card, width=processed.width, height=processed.height, created_at=at
    )
    session.add(image)
    session.flush()
    return str(image.id)


def load_catalogue(session, seed_file: Path = SEED_DIR / 'catalogue.json') -> str:
    """The starting catalogue, into an empty shop. The caller commits."""
    data = json.loads(seed_file.read_text(encoding='utf-8'))
    folder = seed_file.parent / 'images'
    at = clock.now()
    photos: dict[str, str] = {}

    def photo(name: str) -> str:
        if name not in photos:
            photos[name] = _photo(session, folder, name, at)
        return photos[name]

    for position, c in enumerate(data['categories'], start=1):
        session.add(
            Category(
                id=c['id'],
                name=c['name'],
                icon=c.get('icon') or '',
                image_id=photo(c['image']) if c.get('image') else None,
                position=position,
                visible=True,
            )
        )
    session.flush()
    for position, p in enumerate(data['products'], start=1):
        session.add(
            Product(
                id=p['id'],
                name=p['name'],
                category_id=p['category'],
                description=p.get('description') or '',
                specs=p.get('specs') or [],
                sizes=p.get('sizes') or [],
                price=None,
                mrp=None,
                in_stock=p.get('inStock', True),
                visible=True,
                featured=False,
                position=position,
                image_ids=[photo(name) for name in p.get('images', [])],
                created_at=at,
                updated_at=at,
            )
        )
    for position, s in enumerate(data['showrooms'], start=1):
        session.add(
            Showroom(
                city=s['city'],
                is_flagship=bool(s.get('isFlagship')),
                title=s.get('title', ''),
                address=s.get('address', ''),
                phone=s.get('phone', ''),
                timing=s.get('timing', ''),
                features=s.get('features', []),
                map_query=s.get('mapQuery', ''),
                stores=s.get('stores', []),
                position=position,
            )
        )
    for position, t in enumerate(data['testimonials'], start=1):
        session.add(
            Testimonial(
                author=t['author'],
                location=t.get('location', ''),
                quote=t['quote'],
                rating=int(t.get('rating', 5)),
                tree_model=t.get('treeModel', ''),
                position=position,
            )
        )
    return (
        f'{len(data["categories"])} categories, {len(data["products"])} products ({len(photos)} photos), '
        f'{len(data["showrooms"])} showrooms and {len(data["testimonials"])} testimonials loaded.'
    )


def seed() -> str:
    settings = get_settings()
    report = []
    with session_scope() as session:
        password = settings.admin_password.get_secret_value()
        made_up = not password
        password = password or secrets.token_urlsafe(12)
        if accounts.ensure_admin(session, settings.admin_username, password):
            shown = f' with the password {password} (change it after signing in)' if made_up else ''
            report.append(f'Admin login "{settings.admin_username.strip().lower()}" made{shown}.')
        else:
            report.append('The admin login is already there (its password is unchanged).')
        if session.scalar(select(func.count()).select_from(Category)):
            report.append('The shop already has a catalogue; it was left as it is.')
        else:
            report.append(load_catalogue(session))
    return ' '.join(report)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='python -m app.cli', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('seed', help='the admin login and, on an empty shop, the starting catalogue')
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == 'seed':
        print(seed())
    return 0


if __name__ == '__main__':
    sys.exit(main())
