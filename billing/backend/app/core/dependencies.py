"""FastAPI dependencies every module shares."""

import asyncio
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from . import security
from .config import Settings, get_settings
from .database import POOL_SIZE, get_session_factory

AppSettings = Annotated[Settings, Depends(get_settings)]

# At most POOL_SIZE requests hold a session at once; the rest queue here, on the event loop, holding nothing.
# Without it, every showroom refreshing at once had more requests on worker threads waiting for a connection
# than the pool had, while the requests holding the connections needed a free thread to finish and give them
# back: everything stalled until the pool's 30-second timeout. These dependencies are async for the same
# reason: opening and closing the session needs no worker thread. Every request uses exactly one session.
_sessions = asyncio.Semaphore(POOL_SIZE)


async def _session(demo: bool) -> AsyncIterator[Session]:
    """One session for a request, closed afterwards. Services commit their own work."""
    async with _sessions:
        with get_session_factory(demo)() as session:
            yield session


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


async def get_session(request: Request, settings: AppSettings) -> AsyncIterator[Session]:
    """One session per request: on the demo schema for a demo login, else on the real data."""
    async for session in _session(demo=_demo_token(request, settings)):
        yield session


async def get_live_session() -> AsyncIterator[Session]:
    """A session on the real data whatever token comes with the request, for the real sign-in."""
    async for session in _session(demo=False):
        yield session


async def get_demo_session() -> AsyncIterator[Session]:
    """A session on the demo data, for signing in to the demo."""
    async for session in _session(demo=True):
        yield session


DbSession = Annotated[Session, Depends(get_session)]
LiveSession = Annotated[Session, Depends(get_live_session)]
DemoSession = Annotated[Session, Depends(get_demo_session)]
