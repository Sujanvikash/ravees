from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core import security
from app.core.errors import InvalidInput, NotFound
from app.modules.locations.constants import ADMIN_USERNAME, LOGIN_ORDER, SHOWROOM_IDS

from . import repository
from .models import Role, User

MIN_PASSWORD = 6
MAX_PASSWORD = 128


def _login_position(user: User) -> int:
    return LOGIN_ORDER.index(user.username) if user.username in LOGIN_ORDER else len(LOGIN_ORDER)


def list_logins(session: Session) -> list[User]:
    """Every login: the showrooms in the frontend's order, then the admin, then anything else."""
    return sorted(repository.list_all(session), key=_login_position)


def get_login(session: Session, username: str) -> User:
    user = repository.get(session, username)
    if not user:
        raise NotFound(f'No login called {username}.')
    return user


def set_password(session: Session, username: str, password: str) -> User:
    """A new password for a login. Tokens issued before now stop working, so anyone signed in as it is signed
    out on every computer."""
    if len(password) < MIN_PASSWORD:
        raise InvalidInput(f'Use at least {MIN_PASSWORD} characters.')
    if len(password) > MAX_PASSWORD:
        raise InvalidInput(f'Use at most {MAX_PASSWORD} characters.')
    user = get_login(session, username)
    user.password_hash = security.hash_password(password)
    user.password_changed_at = datetime.now(UTC)
    session.commit()
    return user


def reset_password(session: Session, username: str) -> User:
    """Puts a login back to its default password (username@2026)."""
    user = get_login(session, username)
    user.password_hash = security.hash_password(security.default_password(username))
    user.password_changed_at = None
    session.commit()
    return user


def add_missing_logins(session: Session) -> int:
    """Adds a login for each showroom and the admin if it isn't there yet, with the default password. Never
    changes an existing login. Returns how many were added; the caller commits."""
    wanted = [(s, Role.LOCATION.value, s) for s in SHOWROOM_IDS] + [(ADMIN_USERNAME, Role.ADMIN.value, None)]
    existing = repository.existing_usernames(session)
    added = 0
    for username, role, location_id in wanted:
        if username in existing:
            continue
        password_hash = security.hash_password(security.default_password(username))
        repository.add(
            session, User(username=username, role=role, location_id=location_id, password_hash=password_hash)
        )
        added += 1
    return added
