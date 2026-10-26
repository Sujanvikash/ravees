from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.users.models import User


class LoginIn(ApiModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class SessionOut(ApiModel):
    """What the frontend keeps as its session: the same shape it used before the backend existed."""

    username: str
    role: str
    location: str | None

    @classmethod
    def from_model(cls, user: User) -> 'SessionOut':
        return cls(username=user.username, role=user.role, location=user.location_id)


class LoginOut(ApiModel):
    token: str  # send it as Authorization: Bearer <token>
    session: SessionOut
