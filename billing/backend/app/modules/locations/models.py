from sqlalchemy import Boolean, Integer, String, select, text
from sqlalchemy.orm import Mapped, mapped_column, object_session

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

    @property
    def label(self) -> str:
        """The store as history, messages and reports name it: its city, or the city and area where another store
        shares the city (Chennai Egmore, Chennai Palavakkam). The frontend names them the same way (src/config.js)."""
        session = object_session(self)
        others = select(Location.id).where(Location.city == self.city, Location.id != self.id).limit(1)
        return f'{self.city} {self.area}' if session and session.scalar(others) else self.city
