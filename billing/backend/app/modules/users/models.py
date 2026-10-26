from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Role(StrEnum):
    LOCATION = 'location'  # a showroom: bills and sees only its own sales
    ADMIN = 'admin'  # sees everything and manages logins and the catalogue


class User(Base):
    """A login: one per showroom (role 'location') and the admin. password_changed_at is null while the
    password is still the default one; tokens issued before it no longer work."""

    __tablename__ = 'users'

    username: Mapped[str] = mapped_column(String(32), primary_key=True)
    role: Mapped[str] = mapped_column(String(16))
    location_id: Mapped[str | None] = mapped_column(ForeignKey('locations.id'))
    password_hash: Mapped[str] = mapped_column(Text)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN
