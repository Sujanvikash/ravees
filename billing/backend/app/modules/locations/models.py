from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Location(Base):
    """A showroom. next_product_no numbers the showroom's own products (CHN-0001, CHN-0002, ...)."""

    __tablename__ = 'locations'

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    city: Mapped[str] = mapped_column(String(64))
    area: Mapped[str] = mapped_column(String(64))
    bill_prefix: Mapped[str] = mapped_column(String(8), unique=True)
    next_product_no: Mapped[int] = mapped_column(Integer, default=1, server_default='1')
