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
def get_settings(session: DbSession, user: OptionalUser, location: str | None = None) -> AppSettingsOut:
    """The settings in force. Open to all, signed in or not: the sign-in screen uses the appearance ones. A
    showroom gets its own settings laid over the admin's defaults; the admin and the sign-in screen get the
    defaults, or a given showroom's own with `?location=` (admin only, to edit that store's bill details)."""
    if user and not user.is_admin:
        loc = user.location_id
    elif user and user.is_admin:
        loc = location
    else:
        loc = None
    return settings.get(session, loc)


@settings_router.patch('')
def update_settings(body: AppSettingsPatch, user: CurrentUser, session: DbSession, location: str | None = None) -> AppSettingsOut:
    """The admin changes any switch (saved globally), or a given showroom's own appearance and bill details with
    `?location=`; a showroom changes only its own."""
    return settings.update(session, body, user=user, location=location if user.is_admin else None)


class HealthOut(ApiModel):
    ok: bool


@router.get('/health', responses={503: {'description': 'The database cannot be reached'}})
def health(session: DbSession) -> HealthOut:
    """Is the API up, and can it reach the database?"""
    if not repository.database_reachable(session):
        raise ServiceUnavailable()
    return HealthOut(ok=True)
