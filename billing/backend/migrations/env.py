"""
Alembic's entry point. The database comes from DATABASE_URL (the environment or .env), and the tables from the
app's model registry, so `uv run alembic revision --autogenerate -m "..."` compares against every module.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db_models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# '%' is special in Alembic's ini-style config; a password containing it must be escaped
config.set_main_option('sqlalchemy.url', get_settings().database_url.replace('%', '%%'))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Writes the SQL out instead of running it (alembic upgrade head --sql)."""
    context.configure(
        url=config.get_main_option('sqlalchemy.url'),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Runs the migrations against the database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
