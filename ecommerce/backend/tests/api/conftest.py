"""
API tests: the real app against a real PostgreSQL, TEST_DATABASE_URL (a throwaway database, never your real one).
Its tables are made at the start of the run (with the admin login, and no catalogue: each test adds what it needs)
and dropped at the end. Without TEST_DATABASE_URL, or when it can't be reached, every test here is skipped.
"""

import io
import re
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from PIL import Image as Pil
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.database import get_engine, session_scope
from app.core.throttling import get_login_throttle
from app.db_models import Base
from app.main import create_app
from app.modules.accounts import service as accounts
from app.modules.enquiries.router import get_enquiry_throttle
from app.modules.mail import service as mail
from app.modules.orders import razorpay

from ..conftest import TEST_DATABASE_URL

Headers = dict[str, str]


@pytest.fixture(scope='session', autouse=True)
def database() -> Iterator[None]:
    if not TEST_DATABASE_URL:
        pytest.skip('API tests need PostgreSQL: set TEST_DATABASE_URL (see .env.example).')
    engine = get_engine()
    try:
        with engine.connect() as connection:
            # a URL with ?options=-csearch_path%3D<schema> keeps the tables in that schema: make it if need be
            schema = re.search(r'search_path(?:%3D|=)(\w+)', TEST_DATABASE_URL)
            if schema:
                connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS {schema[1]}'))
                connection.commit()
    except OperationalError as error:
        reason = str(error.orig or error).strip().splitlines()[0]
        pytest.skip(f'API tests need PostgreSQL, and TEST_DATABASE_URL could not be reached: {reason}')
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with session_scope() as session:
        accounts.ensure_admin(session, 'admin', 'admin-test-pass')
    yield
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch) -> None:
    """Every test starts with no failed sign-ins counted, an empty outbox, and Razorpay stood in for."""
    for throttle in (get_login_throttle(), accounts.get_reset_throttle(), get_enquiry_throttle()):
        throttle.clear()
    mail.OUTBOX.clear()
    monkeypatch.setattr(razorpay, 'create_order', lambda amount, receipt, notes: f'order_{uuid.uuid4().hex[:14]}')


@pytest.fixture(scope='session')
def client() -> TestClient:
    """Requests go to the API prefix: client.get('/storefront') is GET /api/v1/storefront."""
    return TestClient(create_app(), base_url=f'http://testserver{get_settings().api_prefix}')


def bearer(token: str) -> Headers:
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin(client: TestClient) -> Headers:
    r = client.post('/admin/login', json={'username': 'admin', 'password': 'admin-test-pass'})
    assert r.status_code == 200, r.text
    return bearer(r.json()['token'])


def signup(client: TestClient, email: str | None = None, password: str = 'snowfall-2026') -> tuple[Headers, dict]:
    email = email or f'{uuid.uuid4().hex[:10]}@example.com'
    r = client.post(
        '/auth/signup', json={'name': 'Asha Mathew', 'email': email, 'phone': '98400 12345', 'password': password}
    )
    assert r.status_code == 201, r.text
    return bearer(r.json()['token']), r.json()['customer']


@pytest.fixture
def customer(client: TestClient) -> Headers:
    return signup(client)[0]


def png(width: int = 900, height: int = 700, color: str = 'green') -> bytes:
    out = io.BytesIO()
    Pil.new('RGB', (width, height), color).save(out, 'PNG')
    return out.getvalue()


def upload(client: TestClient, admin: Headers, data: bytes | None = None) -> dict:
    r = client.post('/admin/images', files={'file': ('photo.png', data or png(), 'image/png')}, headers=admin)
    assert r.status_code == 201, r.text
    return r.json()


def category(client: TestClient, admin: Headers, name: str | None = None, **extra) -> dict:
    r = client.post(
        '/admin/categories', json={'name': name or f'Category {uuid.uuid4().hex[:6]}', **extra}, headers=admin
    )
    assert r.status_code == 201, r.text
    return r.json()


def product(client: TestClient, admin: Headers, category_id: str, **extra) -> dict:
    body = {'name': f'Product {uuid.uuid4().hex[:6]}', 'category': category_id, **extra}
    r = client.post('/admin/products', json=body, headers=admin)
    assert r.status_code == 201, r.text
    return r.json()
