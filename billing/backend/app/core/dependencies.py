"""FastAPI dependencies every module shares."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import get_session

DbSession = Annotated[Session, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]
