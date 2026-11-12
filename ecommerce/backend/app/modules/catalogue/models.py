import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, deferred, mapped_column

from app.core.database import Base


class Image(Base):
    """A photo the admin uploaded, kept as WebP in two sizes: large (up to 1600px) for the product page and card
    (up to 600px) for grids. Kept in the database so the nightly backup has the photos too."""

    __tablename__ = 'images'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    large: Mapped[bytes] = deferred(mapped_column(LargeBinary))
    card: Mapped[bytes] = deferred(mapped_column(LargeBinary))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Category(Base):
    """A shop category; its id is a slug made from its first name (trees) and never changes. hsn is the HSN code
    its products' invoice lines print (empty: 9505, festive articles)."""

    __tablename__ = 'categories'

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(16), default='')
    image_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('images.id', ondelete='SET NULL'))
    position: Mapped[int] = mapped_column(Integer, default=0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    hsn: Mapped[str] = mapped_column(String(8), default='')


class Product(Base):
    """A product on the website. price and mrp are rupees with GST; without a price it isn't for sale (not shown).
    A store_only product is a store exclusive: shown on the website, sold only in the stores (never in the cart).
    specs [{label, value}], sizes [str] and image_ids [uuid as str, the first is the main photo] are in order."""

    __tablename__ = 'products'

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    category_id: Mapped[str] = mapped_column(ForeignKey('categories.id'), index=True)
    description: Mapped[str] = mapped_column(Text, default='')
    specs: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    sizes: Mapped[list[str]] = mapped_column(JSONB, default=list)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    mrp: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    store_only: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    image_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
