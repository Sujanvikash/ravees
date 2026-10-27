"""The sign-in rules, with a stand-in for the database session (only get and commit are used)."""

from datetime import UTC, datetime, timedelta

import pytest
from argon2 import PasswordHasher

from app.core import security
from app.core.config import get_settings
from app.core.errors import TooManyRequests, Unauthorized
from app.modules.auth import service
from app.modules.auth.throttling import LoginThrottle
from app.modules.users.models import User


class FakeSession:
    def __init__(self, *users: User) -> None:
        self.users = {u.username: u for u in users}
        self.commits = 0
        self.info = {'demo': False}

    def get(self, _model: type, key: str) -> User | None:
        return self.users.get(key)

    def commit(self) -> None:
        self.commits += 1


@pytest.fixture
def goa() -> User:
    return User(username='goa', role='location', location_id='goa', password_hash=security.hash_password('goa@2026'))


def test_login_returns_a_token_for_the_user(goa):
    result = service.login(FakeSession(goa), get_settings(), LoginThrottle(10, 900), ' GOA ', 'goa@2026', '1.2.3.4')
    assert result.user is goa
    claims = security.decode_access_token(result.token, secret=get_settings().jwt_secret.get_secret_value())
    assert (claims.subject, claims.role) == ('goa', 'location')
    assert claims.expires_at - claims.issued_at == pytest.approx(get_settings().token_hours * 3600, abs=1)


@pytest.mark.parametrize(('username', 'password'), [('goa', 'nope'), ('nobody', 'x'), ('goa', '')])
def test_wrong_username_or_password(goa, username, password):
    with pytest.raises(Unauthorized, match='not right'):
        service.login(FakeSession(goa), get_settings(), LoginThrottle(10, 900), username, password, '1.2.3.4')


def test_too_many_wrong_passwords(goa):
    throttle = LoginThrottle(3, 900)
    session = FakeSession(goa)
    for _ in range(3):
        with pytest.raises(Unauthorized):
            service.login(session, get_settings(), throttle, 'goa', 'nope', '1.2.3.4')
    with pytest.raises(TooManyRequests, match='Try again in 15 minutes') as caught:
        service.login(session, get_settings(), throttle, 'goa', 'goa@2026', '1.2.3.4')
    assert 0 < caught.value.retry_after <= 900
    # another computer can still sign in
    assert service.login(session, get_settings(), throttle, 'goa', 'goa@2026', '5.6.7.8').user is goa


def test_a_weak_hash_is_upgraded_at_login():
    weak = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1).hash('pune@2026')
    pune = User(username='pune', role='location', location_id='pune', password_hash=weak)
    session = FakeSession(pune)
    service.login(session, get_settings(), LoginThrottle(10, 900), 'pune', 'pune@2026', '1.2.3.4')
    assert pune.password_hash != weak and not security.needs_rehash(pune.password_hash)
    assert session.commits == 1


def test_tokens_from_before_a_password_change_stop_working(goa):
    settings = get_settings()
    session = FakeSession(goa)
    before = service.issue_token(goa, settings)
    goa.password_changed_at = datetime.now(UTC)
    with pytest.raises(Unauthorized):
        service.user_from_token(session, settings, before)
    after = service.issue_token(goa, settings)
    assert service.user_from_token(session, settings, after) is goa


def test_tokens_for_unknown_logins_or_junk(goa):
    settings = get_settings()
    with pytest.raises(Unauthorized):
        service.user_from_token(FakeSession(), settings, service.issue_token(goa, settings))
    with pytest.raises(Unauthorized):
        service.user_from_token(FakeSession(goa), settings, 'junk')
    expired = security.create_access_token(
        'goa',
        'location',
        secret=settings.jwt_secret.get_secret_value(),
        lifetime=timedelta(hours=1),
        now=datetime.now(UTC) - timedelta(hours=2),
    )
    with pytest.raises(Unauthorized):
        service.user_from_token(FakeSession(goa), settings, expired)
