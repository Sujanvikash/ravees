import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.sales.schemas import LineIn

from .models import Box


class BoxIn(ApiModel):
    """One box as the admin enters it. `id` is made by the frontend: sending the same id again edits the box
    (while it is still in stock)."""

    id: uuid.UUID
    box_no: str = Field(min_length=1, max_length=32)
    stock_no: str = Field(default='', max_length=32)
    shipment: str = Field(default='', max_length=120)
    supplier: str = Field(default='', max_length=120)
    lines: list[LineIn] = Field(min_length=1, max_length=500)


class BoxesIn(ApiModel):
    """Boxes to add or edit together, as from a packing-list Excel: all are saved, or none."""

    boxes: list[BoxIn] = Field(min_length=1, max_length=2000)


class BoxOut(ApiModel):
    id: uuid.UUID
    box_no: str
    stock_no: str
    shipment: str
    supplier: str
    location: str | None
    status: str
    lines: list[dict]
    invoice_id: uuid.UUID | None
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
            invoice_id=b.invoice_id,
            history=b.history,
            created_at=b.created_at,
            updated_at=b.updated_at,
        )
