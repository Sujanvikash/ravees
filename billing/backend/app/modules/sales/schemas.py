import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, field_validator

from app.core.schemas import ApiModel

from .models import Sale, SaleCollection

Qty = Annotated[int, Field(ge=1, le=10_000)]
Amount = Annotated[float, Field(ge=0, le=100_000_000)]

# Indian mobile: 10 digits starting 6-9, with an optional 91 or 0 in front (as src/lib/customer.js)
_MOBILE = re.compile(r'^(?:91|0)?[6-9]\d{9}$')


def phone_digits(phone: str) -> str:
    """The last 10 digits, so "+91 98407-88950" and "9840788950" are the same number."""
    return re.sub(r'\D', '', phone)[-10:]


def check_customer(name: str, phone: str, *, require_name: bool = True, require_mobile: bool = True) -> tuple[str, str]:
    """The customer's name and mobile as stored. A quotation needs both; a bill asks for whichever the admin
    has turned on (require_name / require_mobile). A value that is given is still checked even when it is not
    required, so a mistyped name or number is never saved."""
    name = ' '.join(name.split())
    if (require_name or name) and len(re.sub(r'[^\w]|[\d_]', '', name)) < 2:
        raise ValueError('Enter the customer’s name.')
    digits = re.sub(r'\D', '', phone)
    if (require_mobile or digits) and not _MOBILE.match(digits):
        raise ValueError('Enter a valid 10-digit mobile number.')
    return name, phone_digits(phone)


class CustomerLookupIn(ApiModel):
    phone: str = Field(max_length=32)


class CustomerOut(ApiModel):
    """A returning customer, found by their mobile number: the name on their latest bill and how often they
    have bought, across every showroom."""

    phone: str
    name: str
    bills: int
    last: datetime


def customer_label(phone: str, name: str) -> str:
    """ "Priya · +91 98407 88950", as the frontend's customerLabel."""
    parts = [name, f'+91 {phone[:5]} {phone[5:]}' if len(phone) == 10 else '']
    return ' · '.join(p for p in parts if p) or 'Walk-in'


class LineIn(ApiModel):
    code: str = Field(min_length=1, max_length=32)
    qty: Qty


class DiscountIn(ApiModel):
    """A manual whole-bill discount: `percent` of the subtotal, or a flat `amount` in rupees. The server works
    out what it takes off and caps it at the bill total (see sales/bill.py)."""

    kind: Literal['percent', 'amount']
    value: Annotated[float, Field(gt=0, le=100_000_000)]


class SplitIn(ApiModel):
    """A bill paid partly in cash, partly by UPI and partly by card. At least two parts are more than ₹0."""

    cash: Amount = 0
    upi: Amount = 0
    card: Amount = 0


class PaymentIn(ApiModel):
    """How the customer paid. For cash, `received` is what was handed over; the server works out the change.
    `later` makes it a credit bill: that much of the amount due is left to pay later, and the method, cash and
    split cover only the rest (nothing at all when `later` is the whole amount)."""

    method: Literal['cash', 'upi', 'card', 'split']
    later: Amount = 0
    received: Amount = 0
    approval: str = Field(default='', max_length=64)  # the card machine's approval code
    split: SplitIn | None = None
    print: bool = False


class OfflineIn(ApiModel):
    """A bill the counter made while the internet was down and sends once it is back: the number printed on its
    receipt (from the counter's own offline series, see numbering.check_offline_bill_no) and when it was made."""

    bill_no: str = Field(max_length=32)
    at: AwareDatetime


class SaleIn(ApiModel):
    """A bill from the counter. Prices, totals and the bill number come from the server, except for a bill made
    offline, which keeps the number it was printed with (`offline`). `id` is made by the counter, so a bill sent
    twice (a retry after a dropped connection) is saved once."""

    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=500)
    phone: str = Field(max_length=32)
    name: str = Field(max_length=120)
    payment: PaymentIn
    discount: DiscountIn | None = None
    offline: OfflineIn | None = None

    @field_validator('name')
    @classmethod
    def _tidy_name(cls, value: str) -> str:
        return ' '.join(value.split())


class CollectionIn(ApiModel):
    """A payment towards a credit bill's balance. `id` is made by the counter, so a retry is saved once."""

    id: uuid.UUID
    amount: Annotated[float, Field(gt=0, le=100_000_000)]
    payment: PaymentIn


class OfflineCounterOut(ApiModel):
    """This browser's own number at its showroom, for numbering the bills it makes offline."""

    counter: int


class CollectionOut(ApiModel):
    id: uuid.UUID
    receipt_no: str
    at: datetime
    amount: float
    payment: dict
    by: str

    @classmethod
    def from_model(cls, c: SaleCollection) -> 'CollectionOut':
        return cls(
            id=c.id, receipt_no=c.receipt_no, at=c.at, amount=float(c.amount), payment=c.payment, by=c.created_by
        )


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
    balance: float  # still owed on a credit bill; 0 once paid off
    collections: list[CollectionOut]  # payments towards the balance after the bill, oldest first

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
            balance=float(sale.balance or 0),
            collections=[CollectionOut.from_model(c) for c in sale.collections],
        )
