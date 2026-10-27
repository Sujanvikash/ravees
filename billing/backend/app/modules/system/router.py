from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.core.errors import ServiceUnavailable
from app.core.schemas import ApiModel
from app.modules.auth.dependencies import AdminUser

from . import repository, settings
from .settings import AppSettingsOut, AppSettingsPatch

router = APIRouter(tags=['system'])
settings_router = APIRouter(prefix='/settings', tags=['settings'])


@settings_router.get('')
def get_settings(session: DbSession) -> AppSettingsOut:
    """The admin's switches. Open to all, signed in or not: the sign-in screen uses the appearance ones. With a
    demo token, the demo's own."""
    return settings.get(session)


@settings_router.patch('')
def update_settings(body: AppSettingsPatch, _: AdminUser, session: DbSession) -> AppSettingsOut:
    """Admin: changes some of the switches; the rest stay as they are."""
    return settings.update(session, body)


class HealthOut(ApiModel):
    ok: bool


@router.get('/health', responses={503: {'description': 'The database cannot be reached'}})
def health(session: DbSession) -> HealthOut:
    """Is the API up, and can it reach the database?"""
    if not repository.database_reachable(session):
        raise ServiceUnavailable()
    return HealthOut(ok=True)
