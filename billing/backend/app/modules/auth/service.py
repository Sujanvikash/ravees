import math
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import cache

from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.core import clock, security
from app.core.config import Settings
from app.core.database import is_demo
from app.core.errors import Forbidden, NotFound, ServiceUnavailable, TooManyRequests, Unauthorized
from app.modules.users import repository as users
from app.modules.users.models import User

from . import repository as sign_ins
from .models import SignIn
from .throttling import LoginThrottle

WRONG_PASSWORD = 'That password is not right for this login.'
DEMO_NOT_READY = 'The demo isn’t set up on this server yet. Run: uv run python -m app.cli demo'
WRONG_DEMO_PASSWORD = 'That is not the demo password.'
# The Demo switch's password, kept here only as its Argon2 hash. The same on every server.
DEMO_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$Cs/Tnp43E353fF1FJP7xBw$Fsp5FVS0ELbeiXe1LxLL/r0xjNbApEiD+qi43vfVMWE'
WRONG_EDIT_BILL_PASSWORD = 'That isn’t the password for editing a bill.'
# The password for editing a bill after it was made, kept here only as its Argon2 hash. The same on every server.
EDIT_BILL_PASSWORD_HASH = (
    '$argon2id$v=19$m=65536,t=3,p=4$vOmZI5xYnboeldIM4j+KvA$F8zCqKYnTMvNHDULA0XOC5YQ43kpHTFd+y5VUGRM5Ak'
)
WRONG_DISCOUNT_PASSWORD = 'That isn’t the password for giving a discount.'
# The password for a manual discount on the counter, kept here only as its Argon2 hash. The same on every server.
DISCOUNT_PASSWORD_HASH = (
    '$argon2id$v=19$m=65536,t=3,p=4$TZexUQ37ce8SykvSoGhktA$DR4vn2MjFUjT0WoGaEm/HcqHOqWW6l8O8cOuQA6WSt8'
)
# The demo logins the switch opens: Chennai Egmore and the admin. The demo's other showrooms stay in its data, with no
# way in.
DEMO_LOGINS = ('chennai', 'admin')


@dataclass(frozen=True, slots=True)
class LoginResult:
    token: str
    user: User


@cache
def _dummy_hash() -> str:
    """A hash to check against when the username doesn't exist, so a wrong username takes as long as a wrong
    password and doesn't give away which logins exist."""
    return security.hash_password('no-such-login')


def issue_token(
    user: User,
    settings: Settings,
    *,
    demo: bool = False,
    session_id: str | None = None,
    now: datetime | None = None,
) -> str:
    return security.create_access_token(
        user.username,
        user.role,
        secret=settings.jwt_secret.get_secret_value(),
        lifetime=timedelta(hours=settings.token_hours),
        demo=demo,
        session_id=session_id,
        now=now,
    )


def _signed_in(
    session: Session, settings: Settings, user: User, client: str, device: str, *, demo: bool = False
) -> LoginResult:
    """Keeps the sign-in for the admin's Sign-ins page and returns a token that names it."""
    now = clock.now()
    record = sign_ins.add(
        session,
        SignIn(
            id=uuid.uuid4(),
            username=user.username,
            location_id=user.location_id,
            at=now,
            expires_at=now + timedelta(hours=settings.token_hours),
            address=client[:64],
            device=device[:300],
        ),
    )
    session.commit()
    return LoginResult(token=issue_token(user, settings, demo=demo, session_id=str(record.id), now=now), user=user)


def login(
    session: Session,
    settings: Settings,
    throttle: LoginThrottle,
    username: str,
    password: str,
    client: str,
    device: str = '',
) -> LoginResult:
    """Checks a username and password and returns a token. Raises Unauthorized for a wrong username or password,
    and TooManyRequests once this login has had too many wrong passwords from this client."""
    user = _checked_user(session, throttle, username, password, client)
    return _signed_in(session, settings, user, client, device)


def sign_out(session: Session, settings: Settings, token: str) -> None:
    """Ends the sign-in the token belongs to (the Sign out button). Raises Unauthorized for a token that is no
    longer valid; one from before sign-ins were kept, or already ended, changes nothing."""
    user = user_from_token(session, settings, token)
    claims = security.decode_access_token(token, secret=settings.jwt_secret.get_secret_value())
    try:
        record = sign_ins.get(session, uuid.UUID(claims.session_id)) if claims.session_id else None
    except ValueError:
        record = None
    if record and record.username == user.username and record.ended_at is None:
        record.ended_at = clock.now()
        record.ended = 'signed-out'
        session.commit()


def list_sign_ins(session: Session, since: datetime | None = None) -> Sequence[SignIn]:
    """The sign-ins from `since` on (all without it), newest first."""
    return sign_ins.list_since(session, since)


def check_password(session: Session, throttle: LoginThrottle, user: User, password: str, client: str) -> None:
    """Checks the password for a manual discount, which the counter asks for before one goes on a bill. It is one
    fixed password (DISCOUNT_PASSWORD_HASH), not the login's own, and wrong ones count towards a brake of their own
    (TooManyRequests after too many from this login and client), so they never hold up signing in. The demo has no
    passwords, so there it always passes."""
    if is_demo(session):
        return
    key = f'#discount|{user.username}|{client}'
    _hold_off(throttle, key, 'giving a discount')
    if not security.verify_password(DISCOUNT_PASSWORD_HASH, password):
        throttle.record_failure(key)
        raise Unauthorized(WRONG_DISCOUNT_PASSWORD)
    throttle.reset(key)


def _hold_off(throttle: LoginThrottle, key: str, what: str) -> None:
    """Raises TooManyRequests while `key` has had too many wrong passwords."""
    wait = throttle.retry_after(key)
    if wait:
        minutes = math.ceil(wait / 60)
        raise TooManyRequests(
            f'Too many wrong passwords for {what}. Try again in {minutes} minute{"s" if minutes != 1 else ""}.',
            retry_after=wait,
        )


def _checked_user(session: Session, throttle: LoginThrottle, username: str, password: str, client: str) -> User:
    username = username.strip().lower()
    key = f'{username}|{client}'
    _hold_off(throttle, key, 'this login')

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
    return user


def check_demo_password(settings: Settings, throttle: LoginThrottle, password: str, client: str) -> None:
    """Checks the Demo switch's password. Raises NotFound when the demo is switched off, Unauthorized for a wrong
    password, and TooManyRequests after too many wrong ones from this client."""
    if not settings.demo_enabled:
        raise NotFound('The demo is switched off on this server.')
    key = f'#demo|{client}'
    _hold_off(throttle, key, 'the demo')
    if not security.verify_password(DEMO_PASSWORD_HASH, password):
        throttle.record_failure(key)
        raise Unauthorized(WRONG_DEMO_PASSWORD)
    throttle.reset(key)


def check_edit_bill_password(throttle: LoginThrottle, password: str, client: str) -> None:
    """Checks the password for editing a bill after it was made. A wrong one is Forbidden, not Unauthorized (the
    login itself is fine, and a 401 would sign the counter out), and counts towards a brake of its own:
    TooManyRequests after too many wrong ones from this client."""
    key = f'#edit-bill|{client}'
    _hold_off(throttle, key, 'editing a bill')
    if not security.verify_password(EDIT_BILL_PASSWORD_HASH, password):
        throttle.record_failure(key)
        raise Forbidden(WRONG_EDIT_BILL_PASSWORD)
    throttle.reset(key)


def demo_login(
    session: Session,
    settings: Settings,
    throttle: LoginThrottle,
    username: str,
    password: str,
    client: str = '',
    device: str = '',
) -> LoginResult:
    """Signs in to the demo as Chennai Egmore or the admin, on the demo data. `password` is the Demo switch's;
    the logins themselves need none. `session` must be a demo session."""
    check_demo_password(settings, throttle, password, client)
    username = username.strip().lower()
    if username not in DEMO_LOGINS:
        raise NotFound(f'No demo login {username}.')
    try:
        user = users.get(session, username)
    except ProgrammingError:  # the demo schema hasn't been made yet
        session.rollback()
        raise ServiceUnavailable(DEMO_NOT_READY) from None
    if user is None:
        raise (
            ServiceUnavailable(DEMO_NOT_READY)
            if not users.list_all(session)
            else NotFound(f'No demo login {username}.')
        )
    return _signed_in(session, settings, user, client, device, demo=True)


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
