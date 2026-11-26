from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.core.errors import ServiceUnavailable
from app.core.schemas import ApiModel
from app.modules.auth.dependencies import AdminUser, CurrentUser, OptionalUser

from . import passwords, repository, settings
from .passwords import Kind, NewPasswordIn, PasswordOut
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
    values = settings.get(session, loc)
    return values if user and user.is_admin else settings.without_business(values)


@settings_router.patch('')
def update_settings(
    body: AppSettingsPatch, user: CurrentUser, session: DbSession, location: str | None = None
) -> AppSettingsOut:
    """The admin changes any switch (saved globally), or a given showroom's own appearance and bill details with
    `?location=`; a showroom changes only its own."""
    values = settings.update(session, body, user=user, location=location if user.is_admin else None)
    return values if user.is_admin else settings.without_business(values)


@settings_router.get('/passwords')
def get_passwords(_: AdminUser, session: DbSession) -> list[PasswordOut]:
    """Admin: the passwords the app asks for besides a login's own (editing a bill, deleting one, a discount, the
    Demo switch), as they are now. `password` is null for one still on its built-in password, which isn't kept
    readable. The demo's admin gets only the demo's own for editing and deleting a bill."""
    return passwords.listed(session)


@settings_router.put(
    '/passwords/{kind}',
    responses={403: {'description': 'Not one the demo’s admin sets'}, 422: {'description': 'Too short or long'}},
)
def set_password(kind: Kind, body: NewPasswordIn, _: AdminUser, session: DbSession) -> PasswordOut:
    """Admin: a new password for `kind` (edit_bill | delete_bill | discount | demo), in force at once."""
    return passwords.set_password(session, kind, body.password)


class HealthOut(ApiModel):
    ok: bool


@router.get('/health', responses={503: {'description': 'The database cannot be reached'}})
def health(session: DbSession) -> HealthOut:
    """Is the API up, and can it reach the database?"""
    if not repository.database_reachable(session):
        raise ServiceUnavailable()
    return HealthOut(ok=True)
