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

# Database connections in the pool. app/core/dependencies.py lets no more requests than this hold a session at
# once, so a request never waits for a connection on a worker thread.
POOL_SIZE = 20

# Constraint names Alembic can rely on, the same on every database: pk_customers, fk_products_category_id_categories ...
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
    return create_engine(get_settings().database_url, pool_pre_ping=True, pool_size=POOL_SIZE, max_overflow=0)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(get_engine(), expire_on_commit=False)


@contextmanager
def session_scope() -> Iterator[Session]:
    """A session outside a request (the seed command, test setup): committed if the block succeeds, rolled
    back if it raises."""
    with get_session_factory()() as session, session.begin():
        yield session
