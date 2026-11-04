from sqlalchemy import Boolean, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Location(Base):
    """A showroom. next_product_no numbers the showroom's own products (CHN-0001, CHN-0002, ...). `active` is
    false for a store the admin has removed but that still has history (it is kept, hidden from sign-in)."""

    __tablename__ = 'locations'

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    city: Mapped[str] = mapped_column(String(64))
    area: Mapped[str] = mapped_column(String(64))
    bill_prefix: Mapped[str] = mapped_column(String(8), unique=True)
    next_product_no: Mapped[int] = mapped_column(Integer, default=1, server_default='1')
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text('true'), nullable=False)
