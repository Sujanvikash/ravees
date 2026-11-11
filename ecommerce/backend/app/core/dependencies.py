"""FastAPI dependencies every module shares."""

import asyncio
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import POOL_SIZE, get_session_factory

AppSettings = Annotated[Settings, Depends(get_settings)]

# At most POOL_SIZE requests hold a session at once; the rest queue here, on the event loop, holding nothing, so a
# request on a worker thread never waits for a connection that a request queued behind it is holding.
_sessions = asyncio.Semaphore(POOL_SIZE)


async def get_session() -> AsyncIterator[Session]:
    """One session for a request, closed afterwards. Services commit their own work."""
    async with _sessions:
        with get_session_factory()() as session:
            yield session


DbSession = Annotated[Session, Depends(get_session)]
