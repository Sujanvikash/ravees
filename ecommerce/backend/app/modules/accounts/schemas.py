import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.core.schemas import ApiModel

MIN_PASSWORD = 8


def _clean_phone(value: str) -> str:
    """Digits, spaces, + and - only; at most 20 characters."""
    value = ' '.join(value.split())
    if value and (len(value) > 20 or not all(c.isdigit() or c in ' +-' for c in value)):
        raise ValueError('Enter a phone number with digits only.')
    return value


class SignupIn(ApiModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = ''
    password: str = Field(min_length=MIN_PASSWORD, max_length=200)

    _phone = field_validator('phone')(_clean_phone)

    @field_validator('name')
    @classmethod
    def _name(cls, value: str) -> str:
        return ' '.join(value.split())


class LoginIn(ApiModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)


class ProfileIn(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    phone: str | None = None

    @field_validator('phone')
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        return None if value is None else _clean_phone(value)


class ChangePasswordIn(ApiModel):
    current: str = Field(max_length=200)
    password: str = Field(min_length=MIN_PASSWORD, max_length=200)


class ForgotPasswordIn(ApiModel):
    email: str = Field(max_length=254)


class ResetPasswordIn(ApiModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=MIN_PASSWORD, max_length=200)


class AdminLoginIn(ApiModel):
    username: str = Field(max_length=40)
    password: str = Field(max_length=200)


class CustomerOut(ApiModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    created_at: datetime


class SessionOut(ApiModel):
    token: str
    customer: CustomerOut


class TokenOut(ApiModel):
    token: str


class AdminOut(ApiModel):
    username: str


class AdminSessionOut(ApiModel):
    token: str
    admin: AdminOut


class CustomerSummaryOut(CustomerOut):
    """A customer in the admin's list, with how many paid orders and what they came to."""

    orders: int
    spent: float
