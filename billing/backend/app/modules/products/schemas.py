from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import ConfigDict, Field, field_validator

from app.core.schemas import ApiModel

from .models import Product

MoneyIn = Annotated[Decimal, Field(max_digits=12, decimal_places=2)]


class SeasonIn(ApiModel):
    in_season: bool


class NewProductIn(ApiModel):
    """A showroom's own product. A showroom login always adds to its own showroom; the admin names one."""

    model_config = ConfigDict(str_strip_whitespace=True)

    location: str | None = None
    name: str = Field(min_length=2, max_length=200)
    dept: str = Field(min_length=1, max_length=64)
    mrp: MoneyIn = Field(gt=0)
    offer: MoneyIn | None = Field(default=None, gt=0)  # the MRP if left out
    cost: MoneyIn | None = Field(default=None, ge=0)  # 0 if left out
    gst: Decimal = Decimal(18)
    hsn: str = Field(default='', max_length=16)

    @field_validator('name', mode='before')
    @classmethod
    def _single_spaces(cls, value: object) -> object:
        return ' '.join(value.split()) if isinstance(value, str) else value


class ShopOut(ApiModel):
    location: str
    by: str
    at: datetime


class ProductOut(ApiModel):
    """A product as the frontend's catalogue holds it (src/lib/catalogue.js). Prices are JSON numbers."""

    code: str
    name: str
    type: str
    dept: str
    barcode: str
    hsn: str
    mrp: float
    offer: float
    # Cost is still sent to showroom logins: the counter records it with each sale for the admin's profit
    # figures. When sales move to the server, the server will record it and this goes admin-only.
    cost: float
    gst: float
    in_season: bool
    shop: ShopOut | None

    @classmethod
    def from_model(cls, product: Product) -> 'ProductOut':
        shop = None
        if product.shop_location_id:
            city = product.shop_location.city if product.shop_location else ''
            shop = ShopOut(location=product.shop_location_id, by=product.created_by or city, at=product.created_at)
        return cls(
            code=product.code,
            name=product.name,
            type=product.type,
            dept=product.dept,
            barcode=product.barcode,
            hsn=product.hsn,
            mrp=float(product.mrp),
            offer=float(product.offer),
            cost=float(product.cost),
            gst=float(product.gst),
            in_season=product.in_season,
            shop=shop,
        )


class CatalogueOut(ApiModel):
    season: str
    products: list[ProductOut]
