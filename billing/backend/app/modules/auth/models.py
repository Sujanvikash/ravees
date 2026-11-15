import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SignIn(Base):
    """One sign-in of a login, for the admin's Sign-ins page: who, when, from which address and device, and how it
    ended: signed out (ended 'signed-out') or its password was changed ('password'). One still open after
    expires_at ran out on its own. The demo keeps its own, in the demo schema. No foreign keys: the history
    outlives a removed login or store."""

    __tablename__ = 'sign_ins'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    username: Mapped[str] = mapped_column(String(32), index=True)
    location_id: Mapped[str | None] = mapped_column(String(32))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended: Mapped[str | None] = mapped_column(String(16))
    address: Mapped[str] = mapped_column(String(64), default='')  # the internet address it came from
    device: Mapped[str] = mapped_column(String(300), default='')  # the browser's User-Agent
