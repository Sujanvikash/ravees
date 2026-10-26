from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User


def get(session: Session, username: str) -> User | None:
    return session.get(User, username)


def list_all(session: Session) -> Sequence[User]:
    return session.scalars(select(User)).all()


def existing_usernames(session: Session) -> set[str]:
    return set(session.scalars(select(User.username)))


def add(session: Session, user: User) -> User:
    session.add(user)
    session.flush()
    return user
