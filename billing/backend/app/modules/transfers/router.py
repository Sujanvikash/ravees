import uuid

from fastapi import APIRouter, Response, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import ReturnDocumentsIn, StockReturnIn, StockReturnOut, StockReturnReceiveIn

router = APIRouter(prefix='/purchase-returns', tags=['purchase-returns'])


@router.get('')
def list_stock_returns(user: CurrentUser, session: DbSession, location: str | None = None) -> list[StockReturnOut]:
    """Purchase returns to the admin, oldest first: a showroom's own, or for the admin every showroom's."""
    return [StockReturnOut.from_model(r) for r in service.list_returns(session, user, location)]


@router.post('', status_code=status.HTTP_201_CREATED)
def send_back(body: StockReturnIn, user: CurrentUser, session: DbSession) -> StockReturnOut:
    """A showroom sends items back to the admin; they come off its stock now."""
    return StockReturnOut.from_model(service.send_back(session, user, body))


@router.post('/{return_id}/receive', responses={409: {'description': 'Already counted in'}})
def receive(return_id: uuid.UUID, body: StockReturnReceiveIn, user: CurrentUser, session: DbSession) -> StockReturnOut:
    """Admin: counts the returned items in."""
    return StockReturnOut.from_model(service.receive(session, user, return_id, body))


@router.put('/{return_id}/documents')
def set_documents(
    return_id: uuid.UUID, body: ReturnDocumentsIn, user: CurrentUser, session: DbSession
) -> StockReturnOut:
    """The showroom (or the admin) records the return's e-way bill number and transport, and optionally keeps the
    e-way bill's PDF."""
    return StockReturnOut.from_model(service.set_documents(session, user, return_id, body))


@router.get('/{return_id}/document', response_class=Response, responses={200: {'content': {'application/pdf': {}}}})
def get_document(return_id: uuid.UUID, user: CurrentUser, session: DbSession) -> Response:
    """The e-way bill PDF kept with the return: its showroom's, or the admin's."""
    data, name = service.get_document(session, user, return_id)
    safe = name.replace('"', '')
    return Response(data, media_type='application/pdf', headers={'Content-Disposition': f'inline; filename="{safe}"'})
