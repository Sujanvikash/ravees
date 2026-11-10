import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Box(Base):
    """A box the supplier packed (box 154.GOA, stock no PUA000445, in the shipment "GOA-1 VELANKA 2026"), kept in
    the admin's warehouse. The admin enters what is in it, lines [{code, name, qty}], which adds the items to the
    warehouse stock. Scanning it onto an invoice for a showroom moves it to `invoiced` (location and
    invoice_id set); when the admin adds the paid invoice's items to the showroom's stock it is `stocked`.
    history [{at, by, action, note?}] as on purchase orders."""

    __tablename__ = 'boxes'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    box_no: Mapped[str] = mapped_column(String(32), unique=True)  # as on the label, in capitals
    stock_no: Mapped[str] = mapped_column(String(32), default='', index=True)
    shipment: Mapped[str] = mapped_column(String(120), default='')
    supplier: Mapped[str] = mapped_column(String(120), default='')
    location_id: Mapped[str | None] = mapped_column(ForeignKey('locations.id'), index=True)  # the invoiced showroom
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('transfer_invoices.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)  # in_stock | invoiced | stocked
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
