import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator

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
