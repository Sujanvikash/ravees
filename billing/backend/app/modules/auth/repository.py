import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .models import SignIn


def add(session: Session, record: SignIn) -> SignIn:
    session.add(record)
    session.flush()
    return record


def get(session: Session, sign_in_id: uuid.UUID) -> SignIn | None:
    return session.get(SignIn, sign_in_id)


def end_open(session: Session, username: str, at: datetime, how: str) -> None:
    """Ends every sign-in of the login still open at `at`. The caller commits."""
    session.execute(
        update(SignIn)
        .where(SignIn.username == username, SignIn.ended_at.is_(None), SignIn.expires_at > at)
        .values(ended_at=at, ended=how)
    )


def list_since(session: Session, since: datetime | None = None) -> Sequence[SignIn]:
    """The sign-ins from `since` on (all of them without it), newest first."""
    stmt = select(SignIn).order_by(SignIn.at.desc())
    if since:
        stmt = stmt.where(SignIn.at >= since)
    return session.scalars(stmt).all()
