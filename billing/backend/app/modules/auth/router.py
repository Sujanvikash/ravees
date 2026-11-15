from datetime import datetime

from fastapi import APIRouter, Request, status

from app.core.database import is_demo
from app.core.dependencies import AppSettings, DbSession, DemoSession, LiveSession

from . import service
from .dependencies import AdminUser, BearerToken, CurrentUser, Throttle
from .schemas import DemoLoginIn, LoginIn, LoginOut, PasswordCheckIn, SessionOut, SignInOut

router = APIRouter(prefix='/auth', tags=['auth'])
sign_ins_router = APIRouter(prefix='/sign-ins', tags=['auth'])


def _device(request: Request) -> str:
    return request.headers.get('user-agent', '')


@router.post(
    '/login',
    responses={401: {'description': 'Wrong username or password'}, 429: {'description': 'Too many wrong passwords'}},
)
def login(body: LoginIn, request: Request, session: LiveSession, settings: AppSettings, throttle: Throttle) -> LoginOut:
    """Checks a username and password. Returns a token (send it as Authorization: Bearer ...) and the session."""
    client = request.client.host if request.client else 'unknown'
    result = service.login(session, settings, throttle, body.username, body.password, client, _device(request))
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user))


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT, responses={401: {'description': 'Not signed in'}})
def logout(token: BearerToken, session: DbSession, settings: AppSettings) -> None:
    """Signs out: the sign-in this token belongs to shows as ended on the admin's Sign-ins page. The browser
    forgets the token itself."""
    service.sign_out(session, settings, token)


@router.post(
    '/check-password',
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {'description': 'Wrong password'}, 429: {'description': 'Too many wrong passwords'}},
)
def check_password(
    body: PasswordCheckIn, request: Request, user: CurrentUser, session: DbSession, throttle: Throttle
) -> None:
    """Checks the signed-in login's own password, without signing in again: the counter asks for the store's
    password before it lets a manual discount onto a bill."""
    client = request.client.host if request.client else 'unknown'
    service.check_password(session, throttle, user, body.password, client)


@router.post(
    '/demo/unlock',
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {'description': 'Wrong demo password'},
        404: {'description': 'The demo is switched off on this server'},
        429: {'description': 'Too many wrong passwords'},
    },
)
def unlock_demo(body: PasswordCheckIn, request: Request, settings: AppSettings, throttle: Throttle) -> None:
    """Checks the Demo switch's password, before the sign-in screen shows the demo's logins."""
    client = request.client.host if request.client else 'unknown'
    service.check_demo_password(settings, throttle, body.password, client)


@router.post(
    '/demo',
    responses={
        401: {'description': 'Wrong demo password'},
        404: {'description': 'No such demo login, or the demo is switched off'},
        429: {'description': 'Too many wrong passwords'},
        503: {'description': 'The demo has not been set up on this server'},
    },
)
def demo_login(
    body: DemoLoginIn, request: Request, session: DemoSession, settings: AppSettings, throttle: Throttle
) -> LoginOut:
    """Signs in to the demo as Chennai Egmore or the admin, with the Demo switch's password. Every request made
    with the token works on the demo's sample data, never on the real data."""
    client = request.client.host if request.client else 'unknown'
    result = service.demo_login(session, settings, throttle, body.username, body.password, client, _device(request))
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user, demo=True))


@router.get('/me')
def me(user: CurrentUser, session: DbSession) -> SessionOut:
    """The session of whoever the token belongs to."""
    return SessionOut.from_model(user, demo=is_demo(session))


@sign_ins_router.get('')
def list_sign_ins(_: AdminUser, session: DbSession, since: datetime | None = None) -> list[SignInOut]:
    """Admin: every sign-in from `since` on (all without it), newest first: who, when, from where, and how it
    ended."""
    return [SignInOut.from_model(r) for r in service.list_sign_ins(session, since)]
