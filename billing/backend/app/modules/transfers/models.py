import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockReturn(Base):
    """Stock a showroom sends back to the admin (SR-CHN-0002). lines [{code, name, qty, rate}], counted
    [{code, qty}] once the admin has counted it in, history [{at, by, action, note?}] as on purchase orders."""

    __tablename__ = 'stock_returns'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    location_id: Mapped[str] = mapped_column(ForeignKey('locations.id'), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)  # sent | received
    reason: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text, default='')
    lines: Mapped[list[dict]] = mapped_column(JSONB)
    counted: Mapped[list[dict] | None] = mapped_column(JSONB)
    history: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
