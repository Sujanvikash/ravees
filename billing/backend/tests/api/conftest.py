"""
API tests: the real app against a real PostgreSQL, TEST_DATABASE_URL (a throwaway database, never your real
one). Its tables are created and seeded at the start of the run and dropped at the end. Without
TEST_DATABASE_URL, or when it can't be reached, every test here is skipped and the reason shown.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.cli import seed
from app.core.config import get_settings
from app.core.database import get_engine
from app.db_models import Base
from app.main import create_app
from app.modules.auth.throttling import get_login_throttle

from ..conftest import TEST_DATABASE_URL

Headers = dict[str, str]


@pytest.fixture(scope='session', autouse=True)
def database() -> Iterator[None]:
    if not TEST_DATABASE_URL:
        pytest.skip('API tests need PostgreSQL: set TEST_DATABASE_URL (see .env.example).')
    engine = get_engine()
    try:
        with engine.connect():
            pass
    except OperationalError as error:
        reason = str(error.orig or error).strip().splitlines()[0]
        pytest.skip(f'API tests need PostgreSQL, and TEST_DATABASE_URL could not be reached: {reason}')
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed()
    yield
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def fresh_throttle() -> None:
    """Every test starts with no failed sign-ins counted."""
    get_login_throttle().clear()


@pytest.fixture(scope='session')
def client() -> TestClient:
    """Requests go to the API prefix: client.get('/products') is GET /api/v1/products."""
    return TestClient(create_app(), base_url=f'http://testserver{get_settings().api_prefix}')


def login(client: TestClient, username: str, password: str | None = None) -> Headers:
    r = client.post('/auth/login', json={'username': username, 'password': password or f'{username}@2026'})
    assert r.status_code == 200, r.text
    return {'Authorization': f'Bearer {r.json()["token"]}'}


@pytest.fixture
def admin(client: TestClient) -> Headers:
    return login(client, 'admin')


@pytest.fixture
def chennai(client: TestClient) -> Headers:
    return login(client, 'chennai')
