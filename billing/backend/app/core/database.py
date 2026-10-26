"""
The database connection. The engine is made on first use, not at import, so the app can be imported (for the
OpenAPI schema, the tests' setup, Alembic) before the settings point it anywhere.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

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


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(get_engine(), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """A FastAPI dependency: one session per request, closed afterwards. Services commit their own work."""
    with get_session_factory()() as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    """A session outside a request (the seed command, test setup): committed if the block succeeds, rolled
    back if it raises."""
    with get_session_factory()() as session, session.begin():
        yield session
