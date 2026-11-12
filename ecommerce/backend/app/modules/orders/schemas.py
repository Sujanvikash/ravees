import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.core.india import STATES, state_code
from app.core.schemas import ApiModel

# the same as models.STATUSES
OrderStatus = Literal['pending', 'paid', 'shipped', 'delivered', 'cancelled']


class LineIn(ApiModel):
    product_id: str = Field(max_length=120)
    qty: int = Field(ge=1, le=99)


class AddressIn(ApiModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=10, max_length=20)
    email: EmailStr
    line1: str = Field(min_length=3, max_length=160)
    line2: str = Field(default='', max_length=160)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    pincode: str

    @field_validator('name', 'line1', 'line2', 'city', 'state', 'phone')
    @classmethod
    def _one_line(cls, value: str) -> str:
        return ' '.join(value.split())

    @field_validator('state')
    @classmethod
    def _state(cls, value: str) -> str:
        """One of India's states, by its proper name: it decides the tax on the invoice."""
        code = state_code(value)
        if not code:
            raise ValueError('Choose your state from the list.')
        return STATES[code]

    @field_validator('pincode')
    @classmethod
    def _pincode(cls, value: str) -> str:
        value = value.replace(' ', '')
        if not re.fullmatch(r'[1-9]\d{5}', value):
            raise ValueError('Enter the 6-digit PIN code.')
        return value


class OrderIn(ApiModel):
    id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=100)
    address: AddressIn
    notes: str = Field(default='', max_length=1000)
    # keep this address on the customer's account, to fill in the next checkout
    save_address: bool = False


class VerifyIn(ApiModel):
    razorpay_order_id: str = Field(max_length=40)
    razorpay_payment_id: str = Field(max_length=40)
    razorpay_signature: str = Field(max_length=200)


class StatusIn(ApiModel):
    status: OrderStatus
    note: str = Field(default='', max_length=500)


class LineOut(ApiModel):
    product_id: str
    name: str
    image: str | None
    price: float
    # the MRP when it was above the price (the discount the customer got), else None
    mrp: float | None = None
    qty: int
    amount: float


class OrderCustomer(ApiModel):
    name: str
    email: str
    phone: str


class HistoryEntry(ApiModel):
    at: datetime
    status: str
    note: str = ''


class InvoiceLine(ApiModel):
    description: str
    hsn: str
    qty: int
    rate: float
    taxable: float
    tax: float
    amount: float


class InvoiceSeller(ApiModel):
    name: str
    address: str
    gstin: str
    state: str
    state_code: str
    phone: str
    email: str


class InvoiceBuyer(ApiModel):
    name: str
    lines: list[str]
    phone: str
    email: str


class InvoiceOut(ApiModel):
    """A paid order's tax invoice (see invoice.py): GST at gst_rate% is included in every amount."""

    number: str
    date: datetime
    order_number: str
    seller: InvoiceSeller
    buyer: InvoiceBuyer
    place_of_supply: str
    intra_state: bool
    gst_rate: int
    lines: list[InvoiceLine]
    taxable: float
    cgst: float
    sgst: float
    igst: float
    total: float
    amount_in_words: str
    payment_id: str | None
    paid_at: datetime | None


class OrderOut(ApiModel):
    id: uuid.UUID
    number: str
    status: str
    lines: list[LineOut]
    subtotal: float
    delivery: float
    total: float
    address: dict
    notes: str
    created_at: datetime
    paid_at: datetime | None
    razorpay_payment_id: str | None
    history: list[HistoryEntry]
    customer: OrderCustomer
    invoice: InvoiceOut | None = None


class PaymentOut(ApiModel):
    """What Razorpay Checkout is opened with."""

    key_id: str
    razorpay_order_id: str
    amount: int
    currency: str
    name: str
    description: str
    prefill: dict


class CheckoutOut(ApiModel):
    order: OrderOut
    payment: PaymentOut | None
