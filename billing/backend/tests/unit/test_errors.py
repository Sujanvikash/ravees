import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import (
    AppError,
    Conflict,
    Forbidden,
    InvalidInput,
    NotFound,
    ServiceUnavailable,
    TooManyRequests,
    Unauthorized,
    register_exception_handlers,
)


def _client(error: AppError) -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get('/boom')
    def boom() -> None:
        raise error

    return TestClient(app)


@pytest.mark.parametrize(
    ('error', 'status'),
    [
        (InvalidInput('Choose the showroom.'), 422),
        (Unauthorized('That password is not right for this login.'), 401),
        (Forbidden('Only the admin can do this.'), 403),
        (NotFound('No login called x.'), 404),
        (Conflict('Taken.'), 409),
        (ServiceUnavailable('Down.'), 503),
    ],
)
def test_errors_become_their_status_and_detail(error, status):
    r = _client(error).get('/boom')
    assert r.status_code == status
    assert r.json() == {'detail': error.message}


def test_default_messages():
    assert Unauthorized().message == 'Sign in again.'
    assert _client(Unauthorized()).get('/boom').headers['WWW-Authenticate'] == 'Bearer'


def test_too_many_requests_says_when_to_retry():
    r = _client(TooManyRequests('Slow down.', retry_after=90)).get('/boom')
    assert r.status_code == 429
    assert r.json() == {'detail': 'Slow down.'}
    assert r.headers['Retry-After'] == '90'
