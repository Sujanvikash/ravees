from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import AdminUser, CurrentUser

from . import service
from .schemas import CatalogueOut, NewProductIn, ProductOut, SeasonIn

router = APIRouter(prefix='/products', tags=['products'])


@router.get('')
def list_products(_: CurrentUser, session: DbSession) -> CatalogueOut:
    """The whole catalogue and the current season, for the frontend to keep in memory."""
    catalogue = service.get_catalogue(session)
    return CatalogueOut(season=catalogue.season, products=[ProductOut.from_model(p) for p in catalogue.products])


@router.patch('/{code}')
def set_in_season(code: str, body: SeasonIn, _: AdminUser, session: DbSession) -> ProductOut:
    """Admin: puts a product in this season, or takes it out."""
    return ProductOut.from_model(service.set_in_season(session, code, body.in_season))


@router.post('', status_code=status.HTTP_201_CREATED)
def add_shop_product(body: NewProductIn, user: CurrentUser, session: DbSession) -> ProductOut:
    """A showroom's own product. The server gives it the showroom's next code (CHN-0001 ...) in one database
    step, so two counters adding at once never get the same code."""
    return ProductOut.from_model(service.add_shop_product(session, user, body))
