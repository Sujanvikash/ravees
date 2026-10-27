import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import Field

from app.core.schemas import ApiModel

from .models import CashClose

Rupees = Annotated[float, Field(ge=0, le=100_000_000)]


class DayOut(ApiModel):
    """A showroom's cash for one day so far, to close it."""

    location: str
    day: date
    opening: float  # the float left at the last close (a suggestion until the day is closed)
    bills: int
    cash_sales: float
    cash_refunds: float
    upi: float
    card: float
    expected: float  # opening + cash_sales - cash_refunds
    closed: 'CloseOut | None'


class CloseIn(ApiModel):
    day: date | None = None  # today (IST) if left out
    opening: Rupees
    counted: Rupees
    float_next: Rupees = 0
    denominations: dict[str, int] = Field(default_factory=dict, max_length=20)
    note: str = Field(default='', max_length=1000)


class CloseOut(ApiModel):
    id: uuid.UUID
    location: str
    day: date
    opening: float
    cash_sales: float
    cash_refunds: float
    expected: float
    counted: float
    difference: float
    float_next: float
    other: dict
    denominations: dict
    note: str
    by: str
    at: datetime

    @classmethod
    def from_model(cls, c: CashClose) -> 'CloseOut':
        return cls(
            id=c.id,
            location=c.location_id,
            day=c.day,
            opening=float(c.opening),
            cash_sales=float(c.cash_sales),
            cash_refunds=float(c.cash_refunds),
            expected=float(c.expected),
            counted=float(c.counted),
            difference=float(c.difference),
            float_next=float(c.float_next),
            other=c.other,
            denominations=c.denominations,
            note=c.note,
            by=c.by,
            at=c.at,
        )


DayOut.model_rebuild()
