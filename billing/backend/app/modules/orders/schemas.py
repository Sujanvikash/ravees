import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel

from .models import PurchaseOrder


class OrderLineIn(ApiModel):
    code: str = Field(min_length=1, max_length=32)
    qty: int = Field(ge=1, le=100_000)
    rate: float | None = Field(default=None, ge=0, le=10_000_000)  # the product's cost price if left out


class OrderIn(ApiModel):
    """A new order. A showroom's goes to the admin as a request; the admin's is sent straight to the showroom
    it names."""

    location: str | None = None
    lines: list[OrderLineIn] = Field(min_length=1, max_length=5000)
    note: str = Field(default='', max_length=1000)


class OrderEditIn(ApiModel):
    """The lines as they are now, when a showroom edits its request or the admin approves and sends it."""

    lines: list[OrderLineIn] = Field(min_length=1, max_length=5000)
    note: str = Field(default='', max_length=1000)


class NoteIn(ApiModel):
    note: str = Field(default='', max_length=1000)


class CountedLineIn(ApiModel):
    code: str = Field(min_length=1, max_length=32)
    qty: int = Field(ge=0, le=100_000)


class ReceiveIn(ApiModel):
    """What the showroom counted when the delivery came; only these quantities are added to stock."""

    counted: list[CountedLineIn] = Field(max_length=5000)
    note: str = Field(default='', max_length=1000)


class OrderOut(ApiModel):
    """A purchase order as the frontend keeps it (src/lib/orders.js)."""

    id: uuid.UUID
    number: str
    location: str
    status: str
    lines: list[dict]
    note: str
    counted: list[dict] | None
    history: list[dict]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, order: PurchaseOrder) -> 'OrderOut':
        return cls(
            id=order.id,
            number=order.number,
            location=order.location_id,
            status=order.status,
            lines=order.lines,
            note=order.note,
            counted=order.counted,
            history=order.history,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
