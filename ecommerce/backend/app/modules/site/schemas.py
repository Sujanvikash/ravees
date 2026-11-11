import uuid

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.catalogue.schemas import CategoryOut, ProductOut


class Store(ApiModel):
    name: str = Field(min_length=1, max_length=80)
    address: str = Field(default='', max_length=300)
    phone: str = Field(default='', max_length=80)


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
    stores: list[Store]


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


class StorefrontOut(ApiModel):
    categories: list[CategoryOut]
    products: list[ProductOut]
    showrooms: list[ShowroomOut]
    testimonials: list[TestimonialOut]
    settings: ShopSettings
