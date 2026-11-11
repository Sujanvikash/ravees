import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# pending: waiting for payment; then paid -> shipped -> delivered; or cancelled
STATUSES = ('pending', 'paid', 'shipped', 'delivered', 'cancelled')
PAID_STATUSES = ('paid', 'shipped', 'delivered')


class Order(Base):
    """A customer's order, paid through Razorpay. Its id is made by the website, so a checkout sent twice is one
    order. lines [{product_id, name, image, price, qty, amount}] are a copy of the products as they were bought;
    address {name, phone, email, line1, line2, city, state, pincode}; history [{at, status, note}]."""

    __tablename__ = 'orders'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    number: Mapped[str] = mapped_column(String(24), unique=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customers.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    delivery: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    address: Mapped[dict] = mapped_column(JSONB)
    notes: Mapped[str] = mapped_column(Text, default='')
    razorpay_order_id: Mapped[str | None] = mapped_column(String(40), unique=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(40))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    history: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NumberSeries(Base):
    """The next order number of each financial year (RE-2627-00001)."""

    __tablename__ = 'number_series'

    period: Mapped[str] = mapped_column(String(8), primary_key=True)
    next_no: Mapped[int] = mapped_column(Integer)
