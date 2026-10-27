import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field, field_validator

from app.core.schemas import ApiModel

from .models import Sale

Qty = Annotated[int, Field(ge=1, le=10_000)]
Amount = Annotated[float, Field(ge=0, le=100_000_000)]

# Indian mobile: 10 digits starting 6-9, with an optional 91 or 0 in front (as src/lib/customer.js)
_MOBILE = re.compile(r'^(?:91|0)?[6-9]\d{9}$')


def phone_digits(phone: str) -> str:
    """The last 10 digits, so "+91 98407-88950" and "9840788950" are the same number."""
    return re.sub(r'\D', '', phone)[-10:]


def check_customer(name: str, phone: str) -> tuple[str, str]:
    """The customer's name and mobile as stored. Both are required on a bill and a quotation."""
    name = ' '.join(name.split())
    if len(re.sub(r'[^\w]|[\d_]', '', name)) < 2:
        raise ValueError('Enter the customer’s name.')
    if not _MOBILE.match(re.sub(r'\D', '', phone)):
        raise ValueError('Enter a valid 10-digit mobile number.')
    return name, phone_digits(phone)


def customer_label(phone: str, name: str) -> str:
    """ "Priya · +91 98407 88950", as the frontend's customerLabel."""
    parts = [name, f'+91 {phone[:5]} {phone[5:]}' if len(phone) == 10 else '']
    return ' · '.join(p for p in parts if p) or 'Walk-in'


class LineIn(ApiModel):
    code: str = Field(min_length=1, max_length=32)
    qty: Qty


class SplitIn(ApiModel):
    cash: Amount
    upi: Amount


class PaymentIn(ApiModel):
    """How the customer paid. For cash, `received` is what was handed over; the server works out the change."""

    method: Literal['cash', 'upi', 'card', 'split']
    received: Amount = 0
    approval: str = Field(default='', max_length=64)  # the card machine's approval code
    split: SplitIn | None = None
    print: bool = False


class SaleIn(ApiModel):
    """A bill from the counter. Prices, totals and the bill number come from the server. `id` is made by the
    counter, so a bill sent twice (a retry after a dropped connection) is saved once."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=500)
    phone: str = Field(max_length=32)
    name: str = Field(max_length=120)
    payment: PaymentIn

    @field_validator('name')
    @classmethod
    def _tidy_name(cls, value: str) -> str:
        return ' '.join(value.split())


class SaleLineOut(ApiModel):
    code: str
    name: str
    qty: int
    price: float
    mrp: float
    cost: float
    gst: float


class SaleOut(ApiModel):
    """A sale as the frontend keeps it (src/context/StoreContext.jsx)."""

    id: uuid.UUID
    bill_no: str
    location: str
    at: datetime
    phone: str
    name: str
    customer: str
    by: str
    lines: list[SaleLineOut]
    totals: dict
    payment: dict

    @classmethod
    def from_model(cls, sale: Sale) -> 'SaleOut':
        return cls(
            id=sale.id,
            bill_no=sale.bill_no,
            location=sale.location_id,
            at=sale.at,
            phone=sale.phone,
            name=sale.name,
            customer=customer_label(sale.phone, sale.name),
            by=sale.created_by,
            lines=[
                SaleLineOut(
                    code=line.code,
                    name=line.name,
                    qty=line.qty,
                    price=float(line.price),
                    mrp=float(line.mrp),
                    cost=float(line.cost),
                    gst=float(line.gst),
                )
                for line in sale.lines
            ],
            totals=sale.totals,
            payment=sale.payment,
        )
