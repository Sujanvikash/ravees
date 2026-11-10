import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.sales.schemas import LineIn

from .models import TransferInvoice


class BuyerIn(ApiModel):
    """The showroom as the invoice names it: its business name (e.g. Spark Christmas), address, phone and GSTIN, and
    its state's GST code, the place of supply (33 is Tamil Nadu)."""

    name: str = Field(min_length=1, max_length=120)
    address: str = Field(default='', max_length=300)
    phone: str = Field(default='', max_length=80)
    gstin: str = Field(default='', max_length=20)
    state: str = Field(pattern=r'^\d{2}$')


class InvoiceChangeIn(ApiModel):
    """What an invoice holds: the showroom and its details as printed (`buyer`; left out, the showroom's own
    details are used), the scanned boxes and/or single products (`lines`, at least one of the two) and a note."""

    location: str = Field(min_length=1, max_length=32)
    buyer: BuyerIn | None = None
    box_ids: list[uuid.UUID] = Field(default_factory=list, max_length=2000)
    lines: list[LineIn] = Field(default_factory=list, max_length=500)
    note: str = Field(default='', max_length=1000)


class InvoiceIn(InvoiceChangeIn):
    """A new invoice. `id` is made by the frontend, so sending it twice raises one invoice. `order_id` is the
    showroom's purchase order this answers, if any."""

    id: uuid.UUID
    order_id: uuid.UUID | None = None


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
    buyer: dict | None
    inter_state: bool | None
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
            buyer=inv.buyer,
            inter_state=inv.inter_state,
            history=inv.history,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
        )
