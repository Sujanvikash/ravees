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
    changes to the catalogue don't change past bills or profit figures.

    A credit bill is one the customer didn't pay in full at the counter: payment['later'] is what was left to pay
    then, and `balance` is what is still owed now. It comes down with each collection (SaleCollection) and with
    goods returned against the bill. updated_at moves whenever the bill changes, so a list refresh picks it up."""

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
    balance: Mapped[Decimal] = mapped_column(Money, default=Decimal(0), server_default='0')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True
    )

    lines: Mapped[list['SaleLine']] = relationship(
        lazy='selectin', order_by='SaleLine.position', cascade='all, delete-orphan'
    )
    collections: Mapped[list['SaleCollection']] = relationship(
        lazy='selectin', order_by='SaleCollection.at', cascade='all, delete-orphan'
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


class SaleCollection(Base):
    """A payment towards a credit bill's balance, taken after the bill was made. receipt_no is its own series
    (RC-CHN262700001). payment has the same shape as a sale's (method, received, change, approval, split), for
    the amount collected. The id is made by the counter, so a payment sent twice is saved once."""

    __tablename__ = 'sale_collections'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    receipt_no: Mapped[str] = mapped_column(String(32), unique=True)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales.id', ondelete='CASCADE'), index=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    amount: Mapped[Decimal] = mapped_column(Money)
    payment: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[str] = mapped_column(String(32))
