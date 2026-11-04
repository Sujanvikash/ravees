from fastapi import APIRouter, Request, status

from app.core.database import is_demo
from app.core.dependencies import AppSettings, DbSession, DemoSession, LiveSession

from . import service
from .dependencies import CurrentUser, Throttle
from .schemas import DemoLoginIn, LoginIn, LoginOut, PasswordCheckIn, SessionOut

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post(
    '/login',
    responses={401: {'description': 'Wrong username or password'}, 429: {'description': 'Too many wrong passwords'}},
)
def login(body: LoginIn, request: Request, session: LiveSession, settings: AppSettings, throttle: Throttle) -> LoginOut:
    """Checks a username and password. Returns a token (send it as Authorization: Bearer ...) and the session."""
    client = request.client.host if request.client else 'unknown'
    result = service.login(session, settings, throttle, body.username, body.password, client)
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user))


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


@router.post('/demo', responses={503: {'description': 'The demo has not been set up on this server'}})
def demo_login(body: DemoLoginIn, session: DemoSession, settings: AppSettings) -> LoginOut:
    """Signs in to the demo as one of the same logins (a showroom or the admin), without a password. Every request
    made with the token works on the demo's sample data, never on the real data."""
    result = service.demo_login(session, settings, body.username)
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user, demo=True))


@router.get('/me')
def me(user: CurrentUser, session: DbSession) -> SessionOut:
    """The session of whoever the token belongs to."""
    return SessionOut.from_model(user, demo=is_demo(session))
