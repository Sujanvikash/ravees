"""
Settings for the whole test run, applied before the app is imported.

The app never sees your real DATABASE_URL here: it points at TEST_DATABASE_URL when that is set, and otherwise
at an address nothing listens on. Unit tests never connect; the API tests in tests/api create their tables on
TEST_DATABASE_URL and are skipped when it isn't set or can't be reached.

TEST_DATABASE_URL comes from the environment, else from .env. Setting it empty in the environment turns the API
tests off even when .env has one.
"""

import os

from dotenv import dotenv_values

from app.core.config import BACKEND_DIR

UNUSED_DATABASE = 'postgresql+psycopg://unused:unused@localhost:1/unused'


def _test_database_url() -> str | None:
    if 'TEST_DATABASE_URL' in os.environ:
        return os.environ['TEST_DATABASE_URL'] or None
    return dotenv_values(BACKEND_DIR / '.env').get('TEST_DATABASE_URL') or None


TEST_DATABASE_URL = _test_database_url()

os.environ['DATABASE_URL'] = TEST_DATABASE_URL or UNUSED_DATABASE
os.environ['JWT_SECRET'] = 'test-secret-not-for-production-use-0123456789'
os.environ['ENVIRONMENT'] = 'test'
