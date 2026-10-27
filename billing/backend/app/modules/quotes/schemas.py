import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.sales.schemas import LineIn

from .models import Quote


class QuoteIn(ApiModel):
    """A quotation from a showroom. Prices, totals and the number come from the server. `id` is made by the
    frontend, so saving the same quotation twice keeps one."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=500)
    name: str = Field(max_length=120)
    phone: str = Field(max_length=32)
    valid_days: Literal[7, 15, 30] = 7
    note: str = Field(default='', max_length=1000)


class QuoteOut(ApiModel):
    id: uuid.UUID
    quote_no: str
    location: str
    at: datetime
    by: str
    name: str
    phone: str
    valid_until: datetime
    note: str
    lines: list[dict]
    totals: dict

    @classmethod
    def from_model(cls, quote: Quote) -> 'QuoteOut':
        return cls(
            id=quote.id,
            quote_no=quote.quote_no,
            location=quote.location_id,
            at=quote.at,
            by=quote.by,
            name=quote.name,
            phone=quote.phone,
            valid_until=quote.valid_until,
            note=quote.note,
            lines=quote.lines,
            totals=quote.totals,
        )
