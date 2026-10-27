import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.orders.schemas import CountedLineIn
from app.modules.sales.schemas import LineIn

from .models import StockReturn

# end-of-season: what's left after the sale; another-store: another showroom needs it
Reason = Literal['end-of-season', 'another-store', 'damaged', 'other']


class StockReturnIn(ApiModel):
    """Items a showroom sends back to the admin. `id` is made by the frontend, so a retry sends them once."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=5000)
    reason: Reason
    note: str = Field(default='', max_length=1000)


class StockReturnReceiveIn(ApiModel):
    counted: list[CountedLineIn] = Field(max_length=5000)
    note: str = Field(default='', max_length=1000)


class StockReturnOut(ApiModel):
    id: uuid.UUID
    number: str
    location: str
    status: str
    reason: str
    note: str
    lines: list[dict]
    counted: list[dict] | None
    history: list[dict]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, r: StockReturn) -> 'StockReturnOut':
        return cls(
            id=r.id,
            number=r.number,
            location=r.location_id,
            status=r.status,
            reason=r.reason,
            note=r.note,
            lines=r.lines,
            counted=r.counted,
            history=r.history,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
