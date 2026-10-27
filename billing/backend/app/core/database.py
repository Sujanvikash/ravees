"""
The database connection. The engine is made on first use, not at import, so the app can be imported (for the
OpenAPI schema, the tests' setup, Alembic) before the settings point it anywhere.

The demo lives in the same database, in its own schema (DEMO_SCHEMA) with the same tables: a demo session
translates every table to that schema, so the same code serves both and demo work never touches the real data.
A session knows which it is through session.info['demo'] (is_demo).
"""

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

DEMO_SCHEMA = 'demo'

# Constraint names Alembic can rely on, the same on every database: pk_users, fk_users_location_id_locations ...
NAMING_CONVENTION = {
    'ix': 'ix_%(column_0_label)s',
    'uq': 'uq_%(table_name)s_%(column_0_name)s',
    'ck': 'ck_%(table_name)s_%(constraint_name)s',
    'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s',
    'pk': 'pk_%(table_name)s',
}


class Base(DeclarativeBase):
    """The base of every table. app/db_models.py imports them all so this metadata is complete."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


@lru_cache
def get_engine() -> Engine:
    """The one engine (connection pool) for this process."""
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def get_demo_engine() -> Engine:
    """The same connection pool, with every table read from and written to the demo schema."""
    return get_engine().execution_options(schema_translate_map={None: DEMO_SCHEMA})


@lru_cache
def get_session_factory(demo: bool = False) -> sessionmaker[Session]:
    bind = get_demo_engine() if demo else get_engine()
    return sessionmaker(bind, expire_on_commit=False, info={'demo': demo})


def is_demo(session: Session) -> bool:
    return bool(session.info.get('demo'))


def open_session(demo: bool = False) -> Iterator[Session]:
    """One session for a request, closed afterwards. Services commit their own work."""
    with get_session_factory(demo)() as session:
        yield session


@contextmanager
def session_scope(demo: bool = False) -> Iterator[Session]:
    """A session outside a request (the seed command, test setup): committed if the block succeeds, rolled
    back if it raises."""
    with get_session_factory(demo)() as session, session.begin():
        yield session
