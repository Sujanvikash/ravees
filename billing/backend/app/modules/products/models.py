from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.locations.models import Location

Money = Numeric(12, 2)


class Product(Base):
    """The catalogue: every product from every year (from the product Excel), plus the showrooms' own products
    (shop_location_id set). in_season marks what is on sale this season; the admin can change it."""

    __tablename__ = 'products'

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(32), default='Product')
    dept: Mapped[str] = mapped_column(String(64), default='')
    barcode: Mapped[str] = mapped_column(String(64), default='', index=True)
    hsn: Mapped[str] = mapped_column(String(16), default='')
    mrp: Mapped[Decimal] = mapped_column(Money, default=0)
    offer: Mapped[Decimal] = mapped_column(Money, default=0)
    cost: Mapped[Decimal] = mapped_column(Money, default=0)
    gst: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=18)
    in_season: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    shop_location_id: Mapped[str | None] = mapped_column(ForeignKey('locations.id'))
    created_by: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # the showroom a shop product belongs to; loaded for the whole list in one extra query
    shop_location: Mapped[Location | None] = relationship(lazy='selectin')
