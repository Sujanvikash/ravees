from datetime import datetime

from app.core.schemas import ApiModel

from .models import User


class PasswordIn(ApiModel):
    password: str


class UserOut(ApiModel):
    """A login as the admin's Logins page shows it. passwordChangedAt is null while it has its default password."""

    username: str
    role: str
    location: str | None
    password_changed_at: datetime | None

    @classmethod
    def from_model(cls, user: User) -> 'UserOut':
        return cls(
            username=user.username,
            role=user.role,
            location=user.location_id,
            password_changed_at=user.password_changed_at,
        )
