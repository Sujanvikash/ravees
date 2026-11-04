import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.orders.schemas import CountedLineIn
from app.modules.sales.schemas import LineIn

from .models import Box


class BoxIn(ApiModel):
    """One box as the admin enters it. `id` is made by the frontend: sending the same id again edits the box
    (while it is still packed). `location` is the showroom it goes to; leave it out to tag it later."""

    id: uuid.UUID
    box_no: str = Field(min_length=1, max_length=32)
    stock_no: str = Field(default='', max_length=32)
    shipment: str = Field(default='', max_length=120)
    supplier: str = Field(default='', max_length=120)
    location: str | None = Field(default=None, max_length=32)
    lines: list[LineIn] = Field(min_length=1, max_length=500)


class BoxesIn(ApiModel):
    """Boxes to add or edit together, as from a packing-list Excel: all are saved, or none."""

    boxes: list[BoxIn] = Field(min_length=1, max_length=2000)


class BoxTagIn(ApiModel):
    """Tag packed boxes for a showroom (or untag them with null)."""

    ids: list[uuid.UUID] = Field(min_length=1, max_length=2000)
    location: str | None = Field(default=None, max_length=32)


class BoxReceiveIn(ApiModel):
    counted: list[CountedLineIn] = Field(max_length=500)
    note: str = Field(default='', max_length=1000)


class BoxOut(ApiModel):
    id: uuid.UUID
    box_no: str
    stock_no: str
    shipment: str
    supplier: str
    location: str | None
    status: str
    lines: list[dict]
    counted: list[dict] | None
    history: list[dict]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, b: Box) -> 'BoxOut':
        return cls(
            id=b.id,
            box_no=b.box_no,
            stock_no=b.stock_no,
            shipment=b.shipment,
            supplier=b.supplier,
            location=b.location_id,
            status=b.status,
            lines=b.lines,
            counted=b.counted,
            history=b.history,
            created_at=b.created_at,
            updated_at=b.updated_at,
        )
