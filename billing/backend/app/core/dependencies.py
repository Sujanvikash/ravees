"""FastAPI dependencies every module shares."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from . import security
from .config import Settings, get_settings
from .database import open_session

AppSettings = Annotated[Settings, Depends(get_settings)]


def _demo_token(request: Request, settings: Settings) -> bool:
    """True when the request carries a valid demo token. Anything else (no token, a bad one) gets the real data;
    signing in is checked separately, so a bad token is still refused."""
    scheme, _, token = request.headers.get('Authorization', '').partition(' ')
    if scheme.lower() != 'bearer' or not token:
        return False
    try:
        return security.decode_access_token(token, secret=settings.jwt_secret.get_secret_value()).demo
    except security.TokenError:
        return False


def get_session(request: Request, settings: AppSettings) -> Iterator[Session]:
    """One session per request: on the demo schema for a demo login, else on the real data."""
    yield from open_session(demo=_demo_token(request, settings))


def get_live_session() -> Iterator[Session]:
    """A session on the real data whatever token comes with the request, for the real sign-in."""
    yield from open_session(demo=False)


def get_demo_session() -> Iterator[Session]:
    """A session on the demo data, for signing in to the demo."""
    yield from open_session(demo=True)


DbSession = Annotated[Session, Depends(get_session)]
LiveSession = Annotated[Session, Depends(get_live_session)]
DemoSession = Annotated[Session, Depends(get_demo_session)]
