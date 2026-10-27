import uuid

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import StockReturnIn, StockReturnOut, StockReturnReceiveIn

router = APIRouter(prefix='/stock-returns', tags=['stock-returns'])


@router.get('')
def list_stock_returns(user: CurrentUser, session: DbSession, location: str | None = None) -> list[StockReturnOut]:
    """Stock sent back to the admin, oldest first: a showroom's own, or for the admin every showroom's."""
    return [StockReturnOut.from_model(r) for r in service.list_returns(session, user, location)]


@router.post('', status_code=status.HTTP_201_CREATED)
def send_back(body: StockReturnIn, user: CurrentUser, session: DbSession) -> StockReturnOut:
    """A showroom sends items back to the admin; they come off its stock now."""
    return StockReturnOut.from_model(service.send_back(session, user, body))


@router.post('/{return_id}/receive', responses={409: {'description': 'Already counted in'}})
def receive(return_id: uuid.UUID, body: StockReturnReceiveIn, user: CurrentUser, session: DbSession) -> StockReturnOut:
    """Admin: counts the returned items in."""
    return StockReturnOut.from_model(service.receive(session, user, return_id, body))
