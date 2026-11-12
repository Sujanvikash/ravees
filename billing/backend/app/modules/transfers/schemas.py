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


class Transport(ApiModel):
    """How the goods travel, as printed on the return: the lorry receipt, the vehicle and the cartons."""

    lr_no: str = Field(default='', max_length=64)
    vehicle_no: str = Field(default='', max_length=32)
    cartons: int | None = Field(default=None, ge=0, le=100000)


class StockReturnIn(Transport):
    """Items a showroom sends back to the admin. `id` is made by the frontend, so a retry sends them once."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=5000)
    reason: Reason
    note: str = Field(default='', max_length=1000)


class ReturnDocumentsIn(Transport):
    """The return's e-way bill (made on the GST portal) and transport, recorded after it is sent. The PDF is
    optional, base64."""

    eway_no: str = Field(default='', max_length=32)
    doc_name: str = Field(default='', max_length=200)
    doc_base64: str | None = None


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
    kept: list[dict] | None
    issuer: dict | None
    subtotal: float | None
    lr_no: str
    vehicle_no: str
    cartons: int | None
    eway_no: str
    doc_name: str
    has_document: bool
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
            kept=r.kept,
            issuer=r.issuer,
            subtotal=None if r.subtotal is None else float(r.subtotal),
            lr_no=r.lr_no or '',
            vehicle_no=r.vehicle_no or '',
            cartons=r.cartons,
            eway_no=r.eway_no or '',
            doc_name=r.doc_name or '',
            has_document=r.doc_data is not None,
            history=r.history,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
