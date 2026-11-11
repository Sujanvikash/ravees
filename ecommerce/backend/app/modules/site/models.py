import uuid

from sqlalchemy import Boolean, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Showroom(Base):
    """A city's showrooms on the website: the main store's address and phone, and every store in the city
    (stores [{name, address, phone}]); features [str] are the card's bullet points."""

    __tablename__ = 'showrooms'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    city: Mapped[str] = mapped_column(String(60))
    is_flagship: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(160), default='')
    address: Mapped[str] = mapped_column(Text, default='')
    phone: Mapped[str] = mapped_column(String(80), default='')
    timing: Mapped[str] = mapped_column(String(80), default='')
    features: Mapped[list[str]] = mapped_column(JSONB, default=list)
    map_query: Mapped[str] = mapped_column(String(200), default='')
    stores: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Testimonial(Base):
    __tablename__ = 'testimonials'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    author: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(80), default='')
    quote: Mapped[str] = mapped_column(Text)
    rating: Mapped[int] = mapped_column(Integer, default=5)
    tree_model: Mapped[str] = mapped_column(String(120), default='')
    position: Mapped[int] = mapped_column(Integer, default=0)


class ShopSetting(Base):
    """One of the admin's shop settings by name (delivery_fee, free_delivery_over); see site.service.SETTINGS."""

    __tablename__ = 'shop_settings'

    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[object] = mapped_column(JSONB)
