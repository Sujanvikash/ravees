import uuid
from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.core.schemas import ApiModel

from .models import StockImport

Qty = Annotated[int, Field(ge=1, le=100_000)]
Rate = Annotated[float, Field(ge=0, le=10_000_000)]


class ImportLineIn(ApiModel):
    code: str = Field(min_length=1, max_length=32)
    qty: Qty
    rate: Rate | None = None  # the product's cost price if left out


class StockImportIn(ApiModel):
    """Stock from an Excel. `id` is made by the frontend, so sending the same import twice adds it once."""

    id: uuid.UUID
    location: str | None = None  # the admin names the showroom; a showroom always imports into its own
    file: str = Field(min_length=1, max_length=200)
    source: str | None = Field(default=None, max_length=32)
    lines: list[ImportLineIn] = Field(min_length=1, max_length=5000)


class ImportLineOut(ApiModel):
    code: str
    name: str
    qty: int
    rate: float


class StockImportOut(ApiModel):
    """A stock import as the frontend's Inventory history reads it."""

    id: uuid.UUID
    at: datetime
    by: str
    username: str
    location: str
    file: str
    source: str | None = None
    lines: list[ImportLineOut]

    @classmethod
    def from_model(cls, record: StockImport) -> 'StockImportOut':
        return cls(
            id=record.id,
            at=record.at,
            by=record.by,
            username=record.username,
            location=record.location_id,
            file=record.file,
            source=record.source,
            lines=[ImportLineOut(**line) for line in record.lines],
        )
