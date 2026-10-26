from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import AdminUser

from . import service
from .schemas import PasswordIn, UserOut

router = APIRouter(prefix='/users', tags=['users'])


@router.get('')
def list_users(_: AdminUser, session: DbSession) -> list[UserOut]:
    """Admin: every login, and whether it still has its default password."""
    return [UserOut.from_model(u) for u in service.list_logins(session)]


@router.put('/{username}/password')
def set_password(username: str, body: PasswordIn, _: AdminUser, session: DbSession) -> UserOut:
    """Admin: sets a new password for any login. Anyone signed in as that login is signed out."""
    return UserOut.from_model(service.set_password(session, username, body.password))


@router.post('/{username}/password/reset')
def reset_password(username: str, _: AdminUser, session: DbSession) -> UserOut:
    """Admin: puts a login back to its default password (username@2026)."""
    return UserOut.from_model(service.reset_password(session, username))
