import uuid

from pydantic import Field, field_validator, model_validator

from app.core.schemas import ApiModel

MAX_PRICE = 10_000_000


class Spec(ApiModel):
    label: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=200)


def _clean_text(value: str | None) -> str | None:
    return None if value is None else ' '.join(value.split())


class CategoryPatch(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    icon: str | None = Field(default=None, max_length=16)
    image_id: uuid.UUID | None = None
    visible: bool | None = None

    _name = field_validator('name')(_clean_text)


class CategoryIn(CategoryPatch):
    name: str = Field(min_length=2, max_length=80)


class ProductPatch(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=5000)
    specs: list[Spec] | None = Field(default=None, max_length=40)
    sizes: list[str] | None = Field(default=None, max_length=40)
    price: float | None = Field(default=None, gt=0, le=MAX_PRICE)
    mrp: float | None = Field(default=None, gt=0, le=MAX_PRICE)
    in_stock: bool | None = None
    visible: bool | None = None
    featured: bool | None = None
    image_ids: list[uuid.UUID] | None = Field(default=None, max_length=20)

    _name = field_validator('name')(_clean_text)

    @field_validator('sizes')
    @classmethod
    def _sizes(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        sizes = [' '.join(s.split()) for s in value]
        if any(not s or len(s) > 40 for s in sizes):
            raise ValueError('Each size is 1 to 40 characters.')
        return sizes

    @field_validator('price', 'mrp')
    @classmethod
    def _paise(cls, value: float | None) -> float | None:
        return None if value is None else round(value, 2)

    @model_validator(mode='after')
    def _mrp_not_below_price(self) -> 'ProductPatch':
        if self.price is not None and self.mrp is not None and self.mrp < self.price:
            raise ValueError('The MRP can’t be below the price.')
        return self


class ProductIn(ProductPatch):
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(max_length=80)


class OrderIdsIn(ApiModel):
    """A list in its new order (categories, products, showrooms, testimonials)."""

    ids: list[str] = Field(max_length=5000)


class ImageOut(ApiModel):
    id: uuid.UUID
    url: str
    card_url: str


class CategoryOut(ApiModel):
    id: str
    name: str
    icon: str
    image: str | None
    count: int


class AdminCategoryOut(CategoryOut):
    image_id: uuid.UUID | None
    position: int
    visible: bool


class ProductOut(ApiModel):
    id: str
    name: str
    category: str
    category_label: str
    description: str
    specs: list[Spec]
    sizes: list[str]
    images: list[str]
    image: str | None
    in_stock: bool
    price: float | None
    mrp: float | None
    price_on_request: bool
    featured: bool


class AdminProductOut(ProductOut):
    visible: bool
    position: int
    image_ids: list[uuid.UUID]


class AdminCatalogueOut(ApiModel):
    categories: list[AdminCategoryOut]
    products: list[AdminProductOut]
