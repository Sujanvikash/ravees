from fastapi import APIRouter, Request

from app.core.database import is_demo
from app.core.dependencies import AppSettings, DbSession, DemoSession, LiveSession

from . import service
from .dependencies import CurrentUser, Throttle
from .schemas import DemoLoginIn, LoginIn, LoginOut, SessionOut

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post(
    '/login',
    responses={401: {'description': 'Wrong username or password'}, 429: {'description': 'Too many wrong passwords'}},
)
def login(
    body: LoginIn, request: Request, session: LiveSession, settings: AppSettings, throttle: Throttle
) -> LoginOut:
    """Checks a username and password. Returns a token (send it as Authorization: Bearer ...) and the session."""
    client = request.client.host if request.client else 'unknown'
    result = service.login(session, settings, throttle, body.username, body.password, client)
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user))


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
