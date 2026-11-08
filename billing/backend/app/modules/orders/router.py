import uuid

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import NoteIn, OrderEditIn, OrderIn, OrderOut

router = APIRouter(prefix='/orders', tags=['orders'])

CONFLICT = {409: {'description': 'The order has already moved on (fulfilled, rejected or cancelled)'}}


@router.get('')
def list_orders(user: CurrentUser, session: DbSession, location: str | None = None) -> list[OrderOut]:
    """Purchase orders, oldest first: a showroom's own, or for the admin every showroom's (or one)."""
    return [OrderOut.from_model(o) for o in service.list_orders(session, user, location)]


@router.post('', status_code=status.HTTP_201_CREATED)
def create_order(body: OrderIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """A showroom requests stock (status requested); the admin answers with a transfer invoice."""
    return OrderOut.from_model(service.create_order(session, user, body))


@router.put('/{order_id}', responses=CONFLICT)
def update_request(order_id: uuid.UUID, body: OrderEditIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """The showroom edits its request while the admin hasn't sent it yet."""
    return OrderOut.from_model(service.update_request(session, user, order_id, body))


@router.post('/{order_id}/reject', responses=CONFLICT)
def reject(order_id: uuid.UUID, body: NoteIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """Admin: turns a request down, with a reason."""
    return OrderOut.from_model(service.reject(session, user, order_id, body.note))


@router.post('/{order_id}/cancel', responses=CONFLICT)
def cancel(order_id: uuid.UUID, user: CurrentUser, session: DbSession) -> OrderOut:
    """The showroom withdraws its request before it is sent."""
    return OrderOut.from_model(service.cancel(session, user, order_id))
