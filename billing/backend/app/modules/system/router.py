from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.core.errors import ServiceUnavailable
from app.core.schemas import ApiModel
from app.modules.auth.dependencies import CurrentUser, OptionalUser

from . import repository, settings
from .settings import AppSettingsOut, AppSettingsPatch

router = APIRouter(tags=['system'])
settings_router = APIRouter(prefix='/settings', tags=['settings'])


@settings_router.get('')
def get_settings(session: DbSession, user: OptionalUser) -> AppSettingsOut:
    """The settings in force. Open to all, signed in or not: the sign-in screen uses the appearance ones. A
    showroom gets its own appearance laid over the admin's defaults; the admin and the sign-in screen get the
    defaults."""
    location = user.location_id if user and not user.is_admin else None
    return settings.get(session, location)


@settings_router.patch('')
def update_settings(body: AppSettingsPatch, user: CurrentUser, session: DbSession) -> AppSettingsOut:
    """The admin changes any switch (saved globally); a showroom changes only its own appearance."""
    return settings.update(session, body, user=user)


class HealthOut(ApiModel):
    ok: bool


@router.get('/health', responses={503: {'description': 'The database cannot be reached'}})
def health(session: DbSession) -> HealthOut:
    """Is the API up, and can it reach the database?"""
    if not repository.database_reachable(session):
        raise ServiceUnavailable()
    return HealthOut(ok=True)
