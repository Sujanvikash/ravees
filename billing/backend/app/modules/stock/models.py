import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockLevel(Base):
    """Units of one product at one showroom. Goes up when an order is counted in or stock is imported, down when
    it is billed; it can go below zero when a counter bills beyond what was counted in."""

    __tablename__ = 'stock_levels'

    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), primary_key=True)
    code: Mapped[str] = mapped_column(ForeignKey('products.code'), primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, default=0)


class StockImport(Base):
    """Stock added from an Excel, outside a purchase order: opening stock, goods that came another way, or the
    units entered with a showroom's new product (source 'new-product'). lines: [{code, name, qty, rate}]."""

    __tablename__ = 'stock_imports'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    by: Mapped[str] = mapped_column(String(64))  # "Admin" or the showroom's city, as order history shows it
    username: Mapped[str] = mapped_column(String(32))
    file: Mapped[str] = mapped_column(String(200))
    source: Mapped[str | None] = mapped_column(String(32))
    lines: Mapped[list[dict]] = mapped_column(JSONB)
