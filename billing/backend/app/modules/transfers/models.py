import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockReturn(Base):
    """Stock a showroom sends back to the admin (PR-CHN-0002), valued at the cost price (D.Rate) only: a purchase
    return carries no GST. lines [{code, name, hsn, qty, held, rate, amount}]: held is what the showroom had of it
    when it sent (so the admin sees what it kept back), rate the D.Rate, amount = rate × qty; subtotal is the value
    of the whole return. kept [{code, name, qty, rate, amount}]: at the end of the season, what the showroom still
    had and didn't send at all. counted [{code, qty}] once the admin has counted it in, history [{at, by, action,
    note?}] as on purchase orders. issuer {name, address, phone, gstin, state} is the showroom as its own Settings
    named it then (blank fields print the built-in details). The showroom records the e-way bill (number, its PDF)
    and the transport (LR no., vehicle, cartons). Returns sent before 2026-11-12 have only {code, name, qty, rate}
    lines and no issuer, value, held or kept."""

    __tablename__ = 'stock_returns'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)  # sent | received
    reason: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text, default='')
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    counted: Mapped[list[dict] | None] = mapped_column(JSONB)
    kept: Mapped[list[dict] | None] = mapped_column(JSONB)
    issuer: Mapped[dict | None] = mapped_column(JSONB)
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    lr_no: Mapped[str] = mapped_column(String(64), default='')
    vehicle_no: Mapped[str] = mapped_column(String(32), default='')
    cartons: Mapped[int | None] = mapped_column(Integer)
    eway_no: Mapped[str] = mapped_column(String(32), default='')
    doc_name: Mapped[str] = mapped_column(String(200), default='')
    doc_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
