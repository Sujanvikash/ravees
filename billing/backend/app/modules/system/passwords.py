"""
The passwords the app asks for besides a login's own: for editing a bill after it was made, for deleting one, for
a manual discount on the counter, and the Demo switch's on the sign-in screen. The admin sees and changes them in
Settings → Passwords.

Each is kept as typed in app_settings under 'password:<kind>', so the admin can read it back. Until the admin sets
one, its built-in password applies, which the code holds only as its Argon2 hash (BUILT_IN), so that it isn't in the
repository: the admin's page can't show a built-in one, only take a new one.

The demo keeps its own passwords for editing and deleting a bill, in its own schema (back to the built-in ones
whenever it starts again), and the demo's admin changes only those: the demo asks for no discount password, and the
Demo switch's lives with the real data alone (it is checked before anyone is signed in to either), so only the real
admin changes it.
"""

import hmac
from typing import Literal

from pydantic import Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import is_demo
from app.core.errors import Forbidden, InvalidInput
from app.core.schemas import ApiModel

from . import repository

Kind = Literal['edit_bill', 'delete_bill', 'discount', 'demo']
KINDS: tuple[Kind, ...] = ('edit_bill', 'delete_bill', 'discount', 'demo')
DEMO_KINDS = ('edit_bill', 'delete_bill')  # the ones the demo's admin sets
MIN_LENGTH = 6
MAX_LENGTH = 128
# The built-in passwords, as their Argon2 hashes: the same on every server, until the admin sets one.
BUILT_IN: dict[str, str] = {
    'edit_bill': '$argon2id$v=19$m=65536,t=3,p=4$vOmZI5xYnboeldIM4j+KvA$F8zCqKYnTMvNHDULA0XOC5YQ43kpHTFd+y5VUGRM5Ak',
    'delete_bill': '$argon2id$v=19$m=65536,t=3,p=4$nkyEtyfgHJ0F7904gbWhlQ$oQMZZWwzhVfAL/OX431SrWFnEEavvg4qwdlv0sN8UeU',
    'discount': '$argon2id$v=19$m=65536,t=3,p=4$TZexUQ37ce8SykvSoGhktA$DR4vn2MjFUjT0WoGaEm/HcqHOqWW6l8O8cOuQA6WSt8',
    'demo': '$argon2id$v=19$m=65536,t=3,p=4$Cs/Tnp43E353fF1FJP7xBw$Fsp5FVS0ELbeiXe1LxLL/r0xjNbApEiD+qi43vfVMWE',
}
NOT_IN_DEMO = 'The demo’s admin sets only the passwords for editing and deleting a bill: sign out of the demo first.'


class PasswordOut(ApiModel):
    """One of the passwords as it is now: `password` as the admin set it, or null while the built-in one applies."""

    kind: Kind
    password: str | None


class NewPasswordIn(ApiModel):
    password: str = Field(max_length=200)


def _key(kind: str) -> str:
    return f'password:{kind}'


def _live_value(session: Session, key: str) -> str:
    """A value from the real data's app_settings, on a demo session too: plain SQL isn't moved to the demo schema,
    so the table is found on the database's search path, where the real data is."""
    return session.scalar(text('select value from app_settings where key = :key'), {'key': key}) or ''


def saved(session: Session, kind: str) -> str:
    """The password as the admin last set it, or '' while the built-in one applies."""
    key = _key(kind)
    return _live_value(session, key) if kind == 'demo' else repository.get_value(session, key)


def matches(session: Session, kind: str, password: str) -> bool:
    """Whether `password` is the one for `kind` now."""
    if current := saved(session, kind):
        return hmac.compare_digest(current.encode(), password.encode())
    return security.verify_password(BUILT_IN[kind], password)


def _kinds(session: Session) -> tuple[str, ...]:
    return DEMO_KINDS if is_demo(session) else KINDS


def listed(session: Session) -> list[PasswordOut]:
    """The passwords as the admin of this data sees them (the demo's admin, only DEMO_KINDS)."""
    return [PasswordOut(kind=kind, password=saved(session, kind) or None) for kind in _kinds(session)]


def set_password(session: Session, kind: Kind, password: str) -> PasswordOut:
    """The admin's new password for `kind`, in force at once on every counter."""
    if kind not in _kinds(session):
        raise Forbidden(NOT_IN_DEMO)
    if len(password) < MIN_LENGTH:
        raise InvalidInput(f'Use at least {MIN_LENGTH} characters.')
    if len(password) > MAX_LENGTH:
        raise InvalidInput(f'Use at most {MAX_LENGTH} characters.')
    repository.set_value(session, _key(kind), password)
    session.commit()
    return PasswordOut(kind=kind, password=password)
