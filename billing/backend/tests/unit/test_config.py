import pytest
from pydantic import ValidationError

from app.core.config import Settings

URL = 'postgresql+psycopg://x:x@localhost:1/x'
SECRET = 'a-secret-that-is-long-enough-0123456789'


def test_short_jwt_secret_is_refused():
    with pytest.raises(ValidationError, match='at least 32 characters'):
        Settings(database_url=URL, jwt_secret='CHANGE_ME', _env_file=None)


def test_cors_origins_are_comma_separated(monkeypatch):
    monkeypatch.setenv('CORS_ORIGINS', 'http://localhost:5174, http://localhost:5175,')
    settings = Settings(database_url=URL, jwt_secret=SECRET, _env_file=None)
    assert settings.cors_origins == ['http://localhost:5174', 'http://localhost:5175']


def test_defaults_and_prefix(monkeypatch):
    monkeypatch.setenv('API_PREFIX', 'api/v2/')
    for name in ('TOKEN_HOURS', 'LOGIN_MAX_FAILURES', 'LOGIN_WINDOW_MINUTES'):
        monkeypatch.delenv(name, raising=False)
    settings = Settings(database_url=URL, jwt_secret=SECRET, _env_file=None)
    assert settings.api_prefix == '/api/v2'
    assert settings.token_hours == 14
    assert (settings.login_max_failures, settings.login_window_minutes) == (10, 15)
    assert SECRET not in repr(settings)
