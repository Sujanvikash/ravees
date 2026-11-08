import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel

from .models import TransferInvoice


class InvoiceIn(ApiModel):
    """A transfer invoice for the scanned boxes, to one showroom. `id` is made by the frontend, so sending it
    twice raises one invoice. `order_id` is the showroom's purchase order this answers, if any."""

    id: uuid.UUID
    location: str = Field(min_length=1, max_length=32)
    box_ids: list[uuid.UUID] = Field(min_length=1, max_length=2000)
    order_id: uuid.UUID | None = None
    note: str = Field(default='', max_length=1000)


class DocumentsIn(ApiModel):
    """The e-way bill and/or the regular bill, as the admin made them elsewhere. The PDF is optional, base64."""

    eway_no: str = Field(default='', max_length=32)
    bill_no: str = Field(default='', max_length=64)
    doc_name: str = Field(default='', max_length=200)
    doc_base64: str | None = None


class PayIn(ApiModel):
    ref: str = Field(default='', max_length=100)
    note: str = Field(default='', max_length=1000)


class InvoiceOut(ApiModel):
    id: uuid.UUID
    number: str
    location: str
    status: str
    lines: list[dict]
    markup_pct: float
    subtotal: float
    total: float
    eway_no: str
    bill_no: str
    doc_name: str
    has_document: bool
    paid_at: datetime | None
    paid_ref: str
    note: str
    order_id: uuid.UUID | None
    box_ids: list[uuid.UUID]
    history: list[dict]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, inv: TransferInvoice, box_ids: list[uuid.UUID]) -> 'InvoiceOut':
        return cls(
            id=inv.id,
            number=inv.number,
            location=inv.location_id,
            status=inv.status,
            lines=inv.lines,
            markup_pct=float(inv.markup_pct),
            subtotal=float(inv.subtotal),
            total=float(inv.total),
            eway_no=inv.eway_no,
            bill_no=inv.bill_no,
            doc_name=inv.doc_name,
            has_document=inv.doc_data is not None,
            paid_at=inv.paid_at,
            paid_ref=inv.paid_ref,
            note=inv.note,
            order_id=inv.order_id,
            box_ids=box_ids,
            history=inv.history,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
        )
