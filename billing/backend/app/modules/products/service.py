from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import InvalidInput, NotFound
from app.modules.locations import repository as locations
from app.modules.system import repository as app_settings
from app.modules.users.models import User

from . import repository
from .importer import ImportedCatalogue
from .models import Product
from .schemas import NewProductIn

GST_RATES = frozenset(Decimal(r) for r in (0, 5, 12, 18, 28))


@dataclass(frozen=True, slots=True)
class Catalogue:
    season: str
    products: Sequence[Product]


def get_catalogue(session: Session) -> Catalogue:
    """The whole catalogue (about 3,000 products) and the current season."""
    return Catalogue(season=app_settings.get_value(session, app_settings.SEASON), products=repository.list_all(session))


def set_in_season(session: Session, code: str, in_season: bool) -> Product:
    """Puts a product in this season, or takes it out."""
    product = repository.get(session, code.strip().upper())
    if not product:
        raise NotFound(f'No product with code {code}.')
    product.in_season = in_season
    session.commit()
    return product


def add_shop_product(session: Session, user: User, data: NewProductIn) -> Product:
    """A showroom's own product (an item without a barcode), in season straight away. Its code is the showroom's
    bill prefix and its next number (CHN-0001 ...), skipping any code already taken, e.g. one typed into the
    Excel by hand."""
    location_id = data.location if user.is_admin else user.location_id
    location = locations.get(session, location_id) if location_id else None
    if not location:
        raise InvalidInput('Choose the showroom.')
    offer = data.offer if data.offer is not None else data.mrp
    if offer > data.mrp:
        raise InvalidInput('The offer price can’t be above the MRP.')
    if data.gst not in GST_RATES:
        raise InvalidInput('GST must be 0, 5, 12, 18 or 28%.')

    while True:
        prefix, number = locations.take_next_product_no(session, location.id)
        code = f'{prefix}-{number:04d}'
        if not repository.exists(session, code):
            break

    product = repository.add(
        session,
        Product(
            code=code,
            name=data.name,
            type='Product',
            dept=data.dept,
            barcode='',
            hsn=data.hsn,
            mrp=data.mrp,
            offer=offer,
            cost=data.cost if data.cost is not None else Decimal(0),
            gst=data.gst,
            in_season=True,
            shop_location_id=location.id,
            created_by='Admin' if user.is_admin else location.city,
        ),
    )
    session.commit()
    session.refresh(product)
    return product


def import_catalogue(session: Session, catalogue: ImportedCatalogue, *, season_from_excel: bool) -> None:
    """Adds the Excel's products and updates the details of those already here, and records its season. Unless
    season_from_excel, existing products keep the admin's in-season choices. The caller commits."""
    if catalogue.products:
        repository.upsert_many(session, catalogue.products, keep_in_season=not season_from_excel)
    app_settings.set_value(session, app_settings.SEASON, catalogue.season)
