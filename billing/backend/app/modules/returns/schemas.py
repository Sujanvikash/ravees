import uuid
from datetime import datetime

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.sales.schemas import LineIn, PaymentIn, SaleOut

from .models import SaleReturn


class ExchangeIn(ApiModel):
    """The new bill of an exchange: what the customer takes instead, and how they pay any difference."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=500)
    payment: PaymentIn


class ReturnIn(ApiModel):
    """Items brought back against a bill (by its id or its number). With `exchange`, a new bill is made at the
    same time and the returned value comes off it. `id` is made by the counter, so a retry saves it once."""

    id: uuid.UUID
    sale_id: uuid.UUID | None = None
    bill_no: str | None = Field(default=None, max_length=32)
    lines: list[LineIn] = Field(min_length=1, max_length=500)
    reason: str = Field(default='', max_length=500)
    exchange: ExchangeIn | None = None


class ReturnOut(ApiModel):
    id: uuid.UUID
    return_no: str
    sale_id: uuid.UUID
    bill_no: str
    location: str
    at: datetime
    kind: str
    reason: str
    name: str
    phone: str
    lines: list[dict]
    amount: float
    refund: float
    exchange_bill_no: str | None
    by: str

    @classmethod
    def from_model(cls, r: SaleReturn) -> 'ReturnOut':
        return cls(
            id=r.id,
            return_no=r.return_no,
            sale_id=r.sale_id,
            bill_no=r.sale.bill_no,
            location=r.location_id,
            at=r.at,
            kind=r.kind,
            reason=r.reason,
            name=r.sale.name,
            phone=r.sale.phone,
            lines=r.lines,
            amount=float(r.amount),
            refund=float(r.refund),
            exchange_bill_no=r.exchange_sale.bill_no if r.exchange_sale else None,
            by=r.created_by,
        )


class ReturnResult(ApiModel):
    """The credit note, and for an exchange the new bill (to print)."""

    credit_note: ReturnOut
    sale: SaleOut | None = None


class ReturnableLine(ApiModel):
    code: str
    name: str
    sold: int
    returned: int
    price: float


class ReturnableOut(ApiModel):
    """A bill as the return screen needs it: what can still come back, and until when."""

    sale: SaleOut
    lines: list[ReturnableLine]
    returnable_until: datetime | None  # None: returns are switched off
    open: bool
