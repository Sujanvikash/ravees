"""Who sent the request: CurrentUser for any signed-in login, AdminUser for the admin only."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.dependencies import AppSettings, DbSession
from app.core.errors import Forbidden, Unauthorized
from app.modules.users.models import User

from . import service
from .throttling import LoginThrottle, get_login_throttle

_bearer = HTTPBearer(auto_error=False, description='The token from POST /auth/login.')


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: DbSession,
    settings: AppSettings,
) -> User:
    """The signed-in login, from the Authorization: Bearer token. 401 if missing, expired or no longer valid."""
    if credentials is None:
        raise Unauthorized()
    return service.user_from_token(session, settings, credentials.credentials)


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if not user.is_admin:
        raise Forbidden('Only the admin can do this.')
    return user


AdminUser = Annotated[User, Depends(require_admin)]
Throttle = Annotated[LoginThrottle, Depends(get_login_throttle)]
