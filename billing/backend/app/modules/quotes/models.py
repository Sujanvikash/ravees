import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Quote(Base):
    """A saved quotation (QT-CHN/26-27/00012), kept whole as the frontend shows and prints it:
    lines [{code, name, qty, price, mrp}] and totals as on a sale (sales/bill.py)."""

    __tablename__ = 'quotes'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    quote_no: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    by: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(16))
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    note: Mapped[str] = mapped_column(Text, default='')
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    totals: Mapped[dict] = mapped_column(JSONB)
    created_by: Mapped[str] = mapped_column(String(32))
