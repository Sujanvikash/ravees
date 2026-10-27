from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import StockImportIn, StockImportOut

router = APIRouter(prefix='/stock', tags=['stock'])


@router.get('')
def get_stock(user: CurrentUser, session: DbSession, location: str | None = None) -> dict[str, dict[str, int]]:
    """Units in stock: {location: {code: qty}}. A showroom gets its own; the admin every showroom's (or one)."""
    return service.stock_by_location(session, user, location)


@router.get('/imports')
def list_imports(user: CurrentUser, session: DbSession, location: str | None = None) -> list[StockImportOut]:
    """Stock added from an Excel, oldest first."""
    return [StockImportOut.from_model(r) for r in service.list_imports(session, user, location)]


@router.post('/imports', status_code=status.HTTP_201_CREATED)
def import_stock(body: StockImportIn, user: CurrentUser, session: DbSession) -> StockImportOut:
    """Adds the lines' quantities to a showroom's stock and keeps the import for its history."""
    return StockImportOut.from_model(service.import_stock(session, user, body))
