import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.products.models import Money
from app.modules.sales.models import Sale


class SaleReturn(Base):
    """Goods a customer brought back against a bill. lines: [{code, name, qty, price, gst}] at the price paid.
    amount is their value (to the rupee); refund is the cash handed back: all of it for a return, the part the
    new bill didn't use for an exchange."""

    __tablename__ = 'sale_returns'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    return_no: Mapped[str] = mapped_column(String(32), unique=True)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales.id'), index=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # return | exchange
    reason: Mapped[str] = mapped_column(Text, default='')
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    amount: Mapped[Decimal] = mapped_column(Money)
    refund: Mapped[Decimal] = mapped_column(Money)
    exchange_sale_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('sales.id'))
    created_by: Mapped[str] = mapped_column(String(32))

    sale: Mapped[Sale] = relationship(foreign_keys=[sale_id], lazy='joined')
    exchange_sale: Mapped[Sale | None] = relationship(foreign_keys=[exchange_sale_id], lazy='joined')
