import json
import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.core.schemas import ApiModel

EnquiryType = Literal['contact', 'quote-request', 'consult', 'product']
EnquiryStatus = Literal['new', 'contacted', 'closed']

MAX_DETAILS_BYTES = 20_000


class EnquiryIn(ApiModel):
    type: EnquiryType
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(default='', max_length=254)
    phone: str = Field(default='', max_length=30)
    city: str = Field(default='', max_length=80)
    message: str = Field(default='', max_length=5000)
    details: dict = Field(default_factory=dict)

    @field_validator('name', 'email', 'phone', 'city')
    @classmethod
    def _one_line(cls, value: str) -> str:
        return ' '.join(value.split())

    @field_validator('details')
    @classmethod
    def _not_huge(cls, value: dict) -> dict:
        if len(json.dumps(value)) > MAX_DETAILS_BYTES:
            raise ValueError('That enquiry is too long.')
        return value


class EnquiryStatusIn(ApiModel):
    status: EnquiryStatus


class EnquiryOut(ApiModel):
    id: uuid.UUID
    type: str
    name: str
    email: str
    phone: str
    city: str
    message: str
    details: dict
    customer_id: uuid.UUID | None
    status: str
    created_at: datetime
