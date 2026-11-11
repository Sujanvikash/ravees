import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Enquiry(Base):
    """A message from the website: the contact form, a consultation, a product enquiry or a quote request for a cart
    with price-on-request products. details holds whatever else the form had (the quote request's items...).
    status: new, contacted or closed, set by the admin."""

    __tablename__ = 'enquiries'

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), default='')
    phone: Mapped[str] = mapped_column(String(30), default='')
    city: Mapped[str] = mapped_column(String(80), default='')
    message: Mapped[str] = mapped_column(Text, default='')
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('customers.id', ondelete='SET NULL'))
    status: Mapped[str] = mapped_column(String(16), default='new', index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
