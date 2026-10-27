from datetime import datetime

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import SaleIn, SaleOut

router = APIRouter(prefix='/sales', tags=['sales'])


@router.get('')
def list_sales(
    user: CurrentUser, session: DbSession, location: str | None = None, since: datetime | None = None
) -> list[SaleOut]:
    """Bills, oldest first: a showroom's own, or for the admin every showroom's (or one). With `since`, only
    those saved at or after it."""
    return [SaleOut.from_model(s) for s in service.list_sales(session, user, location, since)]


@router.post('', status_code=status.HTTP_201_CREATED)
def create_sale(body: SaleIn, user: CurrentUser, session: DbSession) -> SaleOut:
    """A bill from a showroom counter. The server prices it, gives it the next bill number and takes the items
    off the showroom's stock. Sending the same `id` again returns the saved bill instead of billing twice."""
    return SaleOut.from_model(service.create_sale(session, user, body))
