from fastapi import APIRouter, Request

from app.core.dependencies import AppSettings, DbSession

from . import service
from .dependencies import CurrentUser, Throttle
from .schemas import LoginIn, LoginOut, SessionOut

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post(
    '/login',
    responses={401: {'description': 'Wrong username or password'}, 429: {'description': 'Too many wrong passwords'}},
)
def login(body: LoginIn, request: Request, session: DbSession, settings: AppSettings, throttle: Throttle) -> LoginOut:
    """Checks a username and password. Returns a token (send it as Authorization: Bearer ...) and the session."""
    client = request.client.host if request.client else 'unknown'
    result = service.login(session, settings, throttle, body.username, body.password, client)
    return LoginOut(token=result.token, session=SessionOut.from_model(result.user))


@router.get('/me')
def me(user: CurrentUser) -> SessionOut:
    """The session of whoever the token belongs to."""
    return SessionOut.from_model(user)
