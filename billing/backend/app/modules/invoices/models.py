import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, LargeBinary, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TransferInvoice(Base):
    """An invoice: what the admin bills a showroom for stock sent to it, at each product's cost price (D.Rate) with
    its GST (18%) on top: lines [{code, name, hsn, qty, cost, rate, amount, gst, tax}] from the scanned boxes and single
    products, rate = cost, subtotal = the amounts (taxable value), total = subtotal + the tax (CGST + SGST at half
    the rate each, or IGST), rounded to the rupee from 2026-11-11 (to the paisa before). Invoices raised
    before 2026-11-10 were cost + an 18% markup (markup_pct 18) with no GST on their lines.
    buyer {name, address, phone, gstin, state} is the showroom as printed on the invoice (state: its GST state code,
    the place of supply); inter_state is true when that isn't the admin's own state (IGST, else CGST + SGST). Both
    are empty on invoices raised before 2026-11-10. seller_address is the admin's address the invoice is from, as
    the admin picked it (the warehouse at Manali or the registered office); empty on invoices raised before
    2026-11-11, which print the business address in Settings. The admin records the e-way bill number and/or
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
    buyer: Mapped[dict | None] = mapped_column(JSONB)
    inter_state: Mapped[bool | None] = mapped_column(Boolean)
    seller_address: Mapped[str] = mapped_column(Text, default='')
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
