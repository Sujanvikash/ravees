from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NumberSeries(Base):
    """The next running number of one kind (bill, quote, order) for one showroom and period. Bills and
    quotations start again each financial year (period '26-27'); purchase orders run on (period '')."""

    __tablename__ = 'number_series'

    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    period: Mapped[str] = mapped_column(String(8), primary_key=True)
    next_no: Mapped[int] = mapped_column(Integer)
