import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Box(Base):
    """A box the supplier packed, sent on to a showroom as it is (box 154.GOA, stock no PUA000445, in the
    shipment "GOA-1 VELANKA 2026"). The admin enters what is in it, lines [{code, name, qty}], and tags the
    showroom it goes to; the showroom scans the box's number when it arrives and counts it in, which adds the
    items to its stock. counted [{code, qty}] once received, history [{at, by, action, note?}] as on purchase
    orders."""

    __tablename__ = 'boxes'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    box_no: Mapped[str] = mapped_column(String(32), unique=True)  # as on the label, in capitals
    stock_no: Mapped[str] = mapped_column(String(32), default='', index=True)
    shipment: Mapped[str] = mapped_column(String(120), default='')
    supplier: Mapped[str] = mapped_column(String(120), default='')
    location_id: Mapped[str | None] = mapped_column(ForeignKey('locations.id'), index=True)  # None: not tagged yet
    status: Mapped[str] = mapped_column(String(16), index=True)  # packed | received
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    counted: Mapped[list[dict] | None] = mapped_column(JSONB)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
