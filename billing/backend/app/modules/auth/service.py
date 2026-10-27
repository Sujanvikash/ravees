import math
from dataclasses import dataclass
from datetime import timedelta
from functools import cache

from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import Settings
from app.core.database import is_demo
from app.core.errors import NotFound, ServiceUnavailable, TooManyRequests, Unauthorized
from app.modules.users import repository as users
from app.modules.users.models import User

from .throttling import LoginThrottle

WRONG_PASSWORD = 'That password is not right for this login.'
DEMO_NOT_READY = 'The demo isn’t set up on this server yet. Run: uv run python -m app.cli demo'


@dataclass(frozen=True, slots=True)
class LoginResult:
    token: str
    user: User


@cache
def _dummy_hash() -> str:
    """A hash to check against when the username doesn't exist, so a wrong username takes as long as a wrong
    password and doesn't give away which logins exist."""
    return security.hash_password('no-such-login')


def issue_token(user: User, settings: Settings, *, demo: bool = False) -> str:
    return security.create_access_token(
        user.username,
        user.role,
        secret=settings.jwt_secret.get_secret_value(),
        lifetime=timedelta(hours=settings.token_hours),
        demo=demo,
    )


def login(
    session: Session, settings: Settings, throttle: LoginThrottle, username: str, password: str, client: str
) -> LoginResult:
    """Checks a username and password and returns a token. Raises Unauthorized for a wrong username or password,
    and TooManyRequests once this login has had too many wrong passwords from this client."""
    username = username.strip().lower()
    key = f'{username}|{client}'
    wait = throttle.retry_after(key)
    if wait:
        minutes = math.ceil(wait / 60)
        raise TooManyRequests(
            f'Too many wrong passwords for this login. Try again in {minutes} minute{"s" if minutes != 1 else ""}.',
            retry_after=wait,
        )

    user = users.get(session, username)
    if user is None:
        security.verify_password(_dummy_hash(), password)
    if user is None or not security.verify_password(user.password_hash, password):
        throttle.record_failure(key)
        raise Unauthorized(WRONG_PASSWORD)
    throttle.reset(key)

    if security.needs_rehash(user.password_hash):
        user.password_hash = security.hash_password(password)
        session.commit()
    return LoginResult(token=issue_token(user, settings), user=user)


def demo_login(session: Session, settings: Settings, username: str) -> LoginResult:
    """Signs in to one of the demo's logins (the same showrooms and admin, on the demo data). No password: the
    demo holds only sample data. `session` must be a demo session."""
    if not settings.demo_enabled:
        raise NotFound('The demo is switched off on this server.')
    try:
        user = users.get(session, username.strip().lower())
    except ProgrammingError:  # the demo schema hasn't been made yet
        session.rollback()
        raise ServiceUnavailable(DEMO_NOT_READY) from None
    if user is None:
        raise ServiceUnavailable(DEMO_NOT_READY) if not users.list_all(session) else NotFound(f'No demo login {username}.')
    return LoginResult(token=issue_token(user, settings, demo=True), user=user)


def user_from_token(session: Session, settings: Settings, token: str) -> User:
    """The login a token belongs to. Raises Unauthorized if the token is invalid or expired, the login is gone,
    or its password was changed after the token was issued."""
    try:
        claims = security.decode_access_token(token, secret=settings.jwt_secret.get_secret_value())
    except security.TokenError:
        raise Unauthorized() from None
    if claims.demo != is_demo(session) or (claims.demo and not settings.demo_enabled):
        raise Unauthorized()
    try:
        user = users.get(session, claims.subject)
    except ProgrammingError:  # a demo token after the demo was taken away
        session.rollback()
        raise Unauthorized() from None
    if user is None:
        raise Unauthorized()
    if user.password_changed_at and claims.issued_at < user.password_changed_at.timestamp():
        raise Unauthorized()
    return user
