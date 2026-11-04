from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core import security
from app.core.database import is_demo
from app.core.errors import Forbidden, InvalidInput, NotFound
from app.modules.locations.constants import ADMIN_USERNAME, LOGIN_ORDER, SHOWROOM_IDS

from . import repository
from .models import Role, User

MIN_PASSWORD = 6
MAX_PASSWORD = 128
DEMO_PASSWORDS = 'Passwords can’t be changed in the demo: its logins don’t use them.'


def _login_position(user: User) -> tuple[int, int, str]:
    """Sort key: the seeded showrooms first in their order, then any store added later (alphabetical), the admin
    last."""
    if user.is_admin:
        return (2, 0, user.username)
    if user.username in LOGIN_ORDER:
        return (0, LOGIN_ORDER.index(user.username), user.username)
    return (1, 0, user.username)


def list_logins(session: Session) -> list[User]:
    """Every login: the seeded showrooms in the frontend's order, then stores added later, then the admin."""
    return sorted(repository.list_all(session), key=_login_position)


def get_login(session: Session, username: str) -> User:
    user = repository.get(session, username)
    if not user:
        raise NotFound(f'No login called {username}.')
    return user


def set_password(session: Session, username: str, password: str) -> User:
    """A new password for a login. Tokens issued before now stop working, so anyone signed in as it is signed
    out on every computer."""
    if is_demo(session):
        raise Forbidden(DEMO_PASSWORDS)
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
    if is_demo(session):
        raise Forbidden(DEMO_PASSWORDS)
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


def create_login(session: Session, location_id: str) -> User:
    """Adds the login for a newly created store: username = the store id, role 'location', default password
    (id@2026). The caller commits."""
    password_hash = security.hash_password(security.default_password(location_id))
    return repository.add(
        session, User(username=location_id, role=Role.LOCATION.value, location_id=location_id, password_hash=password_hash)
    )


def remove_login(session: Session, username: str) -> None:
    """Deletes a login (used only when a brand-new, empty store is removed). The caller commits."""
    user = repository.get(session, username)
    if user:
        session.delete(user)
        session.flush()
