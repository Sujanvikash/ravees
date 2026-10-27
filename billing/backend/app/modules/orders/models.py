import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Status(StrEnum):
    REQUESTED = 'requested'  # a showroom asked for stock; the admin reviews it
    SENT = 'sent'  # the admin sent it; the showroom counts the goods in when they arrive
    RECEIVED = 'received'  # counted in: the counted quantities were added to stock
    REJECTED = 'rejected'  # the admin turned the request down
    CANCELLED = 'cancelled'  # the showroom withdrew its request before it was sent


class PurchaseOrder(Base):
    """One purchase order, kept whole as the frontend uses it (src/lib/orders.js):
    lines [{code, name, qty, rate}], counted [{code, qty}] once received, history [{at, by, action, note?}]."""

    __tablename__ = 'purchase_orders'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    note: Mapped[str] = mapped_column(Text, default='')
    counted: Mapped[list[dict] | None] = mapped_column(JSONB)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
