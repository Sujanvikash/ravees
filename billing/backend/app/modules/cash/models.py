import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.products.models import Money


class CashClose(Base):
    """One showroom's cash count at the end of one day (IST). The bill figures are saved as they were at the
    close; float_next is the cash left in the drawer for the next day, the rest goes to the bank."""

    __tablename__ = 'cash_closes'
    __table_args__ = (UniqueConstraint('location_id', 'day'),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    opening: Mapped[Decimal] = mapped_column(Money)
    cash_sales: Mapped[Decimal] = mapped_column(Money)
    cash_refunds: Mapped[Decimal] = mapped_column(Money)
    expected: Mapped[Decimal] = mapped_column(Money)
    counted: Mapped[Decimal] = mapped_column(Money)
    difference: Mapped[Decimal] = mapped_column(Money)
    float_next: Mapped[Decimal] = mapped_column(Money)
    other: Mapped[dict] = mapped_column(JSONB)  # {bills, upi, card}: the day's other takings, for reference
    denominations: Mapped[dict] = mapped_column(JSONB)  # {"500": 4, "200": 3, ...} as counted, may be empty
    note: Mapped[str] = mapped_column(Text, default='')
    by: Mapped[str] = mapped_column(String(32))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
