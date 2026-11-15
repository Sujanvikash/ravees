import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.users.models import User

from .models import SignIn


class DemoLoginIn(ApiModel):
    username: str = Field(max_length=64)


class LoginIn(ApiModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class PasswordCheckIn(ApiModel):
    password: str = Field(max_length=256)


class SessionOut(ApiModel):
    """What the frontend keeps as its session: the same shape it used before the backend existed."""

    username: str
    role: str
    location: str | None
    demo: bool = False  # signed in to the demo: sample data, kept apart from the real data

    @classmethod
    def from_model(cls, user: User, *, demo: bool = False) -> 'SessionOut':
        return cls(username=user.username, role=user.role, location=user.location_id, demo=demo)


class LoginOut(ApiModel):
    token: str  # send it as Authorization: Bearer <token>
    session: SessionOut


class SignInOut(ApiModel):
    """A sign-in as the admin's Sign-ins page shows it. ended: 'signed-out' or 'password' (the admin changed its
    password); none while it is open, or after it ran out at expires_at."""

    id: uuid.UUID
    username: str
    location: str | None
    at: datetime
    expires_at: datetime
    ended_at: datetime | None
    ended: str | None
    address: str
    device: str

    @classmethod
    def from_model(cls, record: SignIn) -> 'SignInOut':
        return cls(
            id=record.id,
            username=record.username,
            location=record.location_id,
            at=record.at,
            expires_at=record.expires_at,
            ended_at=record.ended_at,
            ended=record.ended,
            address=record.address,
            device=record.device,
        )
