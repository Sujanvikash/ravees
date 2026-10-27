import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.products.models import Money


class Sale(Base):
    """A completed bill. bill_no is handed out by the server (CHN/26-27/00184). totals and payment are kept as
    the frontend shows them (see sales/bill.py and SaleIn). Each line keeps the price and cost as sold, so later
    changes to the catalogue don't change past bills or profit figures."""

    __tablename__ = 'sales'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    bill_no: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    phone: Mapped[str] = mapped_column(String(16), default='')
    name: Mapped[str] = mapped_column(String(120), default='')
    totals: Mapped[dict] = mapped_column(JSONB)
    payment: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    lines: Mapped[list['SaleLine']] = relationship(
        lazy='selectin', order_by='SaleLine.position', cascade='all, delete-orphan'
    )


class SaleLine(Base):
    __tablename__ = 'sale_lines'

    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales.id', ondelete='CASCADE'), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(ForeignKey('products.code'), index=True)
    name: Mapped[str] = mapped_column(String(200))
    qty: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Money)
    mrp: Mapped[Decimal] = mapped_column(Money)
    cost: Mapped[Decimal] = mapped_column(Money)
    gst: Mapped[Decimal] = mapped_column(Numeric(5, 2))
