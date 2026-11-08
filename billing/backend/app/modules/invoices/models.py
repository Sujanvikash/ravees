import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, LargeBinary, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TransferInvoice(Base):
    """What the admin bills a showroom for stock sent to it, at cost price plus the markup (18%): lines
    [{code, name, qty, cost, rate, amount}] from the scanned boxes. The admin records the e-way bill number and/or
    the bill number (and may keep the PDF), marks it paid, and then adds its items to the showroom's stock.
    history [{at, by, action, note?}] as on purchase orders."""

    __tablename__ = 'transfer_invoices'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)  # raised | paid | stocked | cancelled
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    markup_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    eway_no: Mapped[str] = mapped_column(String(32), default='')
    bill_no: Mapped[str] = mapped_column(String(64), default='')
    doc_name: Mapped[str] = mapped_column(String(200), default='')
    doc_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paid_ref: Mapped[str] = mapped_column(String(100), default='')
    note: Mapped[str] = mapped_column(Text, default='')
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('purchase_orders.id'), index=True)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
