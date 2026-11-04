import re

from pydantic import Field, field_validator

from app.core.schemas import ApiModel

from .models import Location


class LocationOut(ApiModel):
    """A store as the frontend keeps it (src/config.js). `active` false: removed but kept for its history."""

    id: str
    city: str
    area: str
    bill_prefix: str
    active: bool

    @classmethod
    def from_model(cls, location: Location) -> 'LocationOut':
        return cls(
            id=location.id,
            city=location.city,
            area=location.area,
            bill_prefix=location.bill_prefix,
            active=location.active,
        )


class CreateStoreIn(ApiModel):
    """A new store. The prefix is unique and becomes the store's id/login (so two stores in one city — Egmore
    and ECR — each get their own, e.g. EGM and ECR). City and area are what the store is called."""

    city: str = Field(min_length=1, max_length=64)
    area: str = Field(min_length=1, max_length=64)
    prefix: str = Field(min_length=2, max_length=8)

    @field_validator('city', 'area')
    @classmethod
    def _tidy(cls, value: str) -> str:
        return ' '.join(value.split())

    @field_validator('prefix')
    @classmethod
    def _prefix(cls, value: str) -> str:
        value = value.strip().upper()
        if not re.fullmatch(r'[A-Z]{2,8}', value):
            raise ValueError('The prefix must be 2–8 letters (e.g. EGM, ECR).')
        return value


class RemoveResult(ApiModel):
    """What happened when a store was removed: deleted outright (no history) or deactivated (kept)."""

    deleted: bool
    store: LocationOut | None = None
