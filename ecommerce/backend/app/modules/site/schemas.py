import re
import uuid

from pydantic import Field, field_validator, model_validator

from app.core.india import STATES, state_code
from app.core.schemas import ApiModel
from app.modules.catalogue.schemas import CategoryOut, ProductOut

GSTIN = re.compile(r'\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]')


class Store(ApiModel):
    """One store in a city. image_ids are its photos (the first is the main one); map_url is its Google Maps link
    (without one, the map looks the store up by its name and address)."""

    name: str = Field(min_length=1, max_length=80)
    address: str = Field(default='', max_length=300)
    phone: str = Field(default='', max_length=80)
    timing: str = Field(default='', max_length=80)
    map_url: str = Field(default='', max_length=500)
    image_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)


class StoreOut(Store):
    images: list[str] = Field(default_factory=list)


class ShowroomPatch(ApiModel):
    city: str | None = Field(default=None, min_length=2, max_length=60)
    is_flagship: bool | None = None
    title: str | None = Field(default=None, max_length=160)
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=80)
    timing: str | None = Field(default=None, max_length=80)
    features: list[str] | None = Field(default=None, max_length=20)
    map_query: str | None = Field(default=None, max_length=200)
    stores: list[Store] | None = Field(default=None, max_length=30)


class ShowroomIn(ShowroomPatch):
    city: str = Field(min_length=2, max_length=60)


class ShowroomOut(ApiModel):
    id: uuid.UUID
    city: str
    is_flagship: bool
    title: str
    address: str
    phone: str
    timing: str
    features: list[str]
    map_query: str
    stores: list[StoreOut]


class TestimonialPatch(ApiModel):
    author: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=80)
    quote: str | None = Field(default=None, min_length=2, max_length=2000)
    rating: int | None = Field(default=None, ge=1, le=5)
    tree_model: str | None = Field(default=None, max_length=120)


class TestimonialIn(TestimonialPatch):
    author: str = Field(min_length=2, max_length=120)
    quote: str = Field(min_length=2, max_length=2000)


class TestimonialOut(ApiModel):
    id: uuid.UUID
    author: str
    location: str
    quote: str
    rating: int
    tree_model: str


class ShopSettings(ApiModel):
    """Delivery: deliveryFee rupees on every order, none when freeDeliveryOver is above 0 and the order reaches it."""

    delivery_fee: int = Field(default=0, ge=0, le=100_000)
    free_delivery_over: int = Field(default=0, ge=0, le=10_000_000)


class ShopSettingsPatch(ApiModel):
    delivery_fee: int | None = Field(default=None, ge=0, le=100_000)
    free_delivery_over: int | None = Field(default=None, ge=0, le=10_000_000)


class Seller(ApiModel):
    """Who the tax invoices of online orders are from (the admin's Settings → Invoices). The state is where the
    seller is registered: an order delivered there pays CGST + SGST, anywhere else IGST.

    By default the Egmore store's own business, SIANNA COLLECTION (the client's choice, 2026-11-12; the same
    business, GSTIN and address its bills carry in the billing app). Raave's Evergreen is the brand on top."""

    name: str = Field(default='SIANNA COLLECTION', min_length=2, max_length=120)
    address: str = Field(
        default='New No. 54, Old No. 18, Casa Major Road,\nEgmore, Chennai – 600 008\n(Opp. Don Bosco School Gate 3)',
        min_length=5,
        max_length=400,
    )
    gstin: str = Field(default='33AFUPE5958A1ZF', max_length=15)
    state: str = Field(default='Tamil Nadu', max_length=60)
    phone: str = Field(default='+91 97516 65555', max_length=60)
    email: str = Field(default='raaves@christmasraave.in', max_length=120)

    @field_validator('name', 'phone', 'email')
    @classmethod
    def _one_line(cls, value: str) -> str:
        return ' '.join(value.split())

    @field_validator('address')
    @classmethod
    def _lines(cls, value: str) -> str:
        return '\n'.join(' '.join(line.split()) for line in value.splitlines() if line.strip())

    @field_validator('gstin')
    @classmethod
    def _gstin(cls, value: str) -> str:
        value = value.replace(' ', '').upper()
        if value and not GSTIN.fullmatch(value):
            raise ValueError('A GSTIN is 15 characters, like 33ABCDE1234F1Z5.')
        return value

    @field_validator('state')
    @classmethod
    def _state(cls, value: str) -> str:
        code = state_code(value)
        if not code:
            raise ValueError('Choose the state from the list.')
        return STATES[code]

    @model_validator(mode='after')
    def _gstin_in_state(self) -> 'Seller':
        if self.gstin and self.gstin[:2] != state_code(self.state):
            raise ValueError(f'That GSTIN is registered in another state than {self.state} (its first two digits).')
        return self

    @property
    def state_code(self) -> str:
        return state_code(self.state) or ''


class StorefrontOut(ApiModel):
    categories: list[CategoryOut]
    products: list[ProductOut]
    showrooms: list[ShowroomOut]
    testimonials: list[TestimonialOut]
    settings: ShopSettings
