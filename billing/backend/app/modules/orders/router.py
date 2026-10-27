import uuid

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import NoteIn, OrderEditIn, OrderIn, OrderOut, ReceiveIn

router = APIRouter(prefix='/orders', tags=['orders'])

CONFLICT = {409: {'description': 'The order has already moved on (sent, received, rejected or cancelled)'}}


@router.get('')
def list_orders(user: CurrentUser, session: DbSession, location: str | None = None) -> list[OrderOut]:
    """Purchase orders, oldest first: a showroom's own, or for the admin every showroom's (or one)."""
    return [OrderOut.from_model(o) for o in service.list_orders(session, user, location)]


@router.post('', status_code=status.HTTP_201_CREATED)
def create_order(body: OrderIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """A showroom requests stock (status requested), or the admin sends stock to a showroom (status sent)."""
    return OrderOut.from_model(service.create_order(session, user, body))


@router.put('/{order_id}', responses=CONFLICT)
def update_request(order_id: uuid.UUID, body: OrderEditIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """The showroom edits its request while the admin hasn't sent it yet."""
    return OrderOut.from_model(service.update_request(session, user, order_id, body))


@router.post('/{order_id}/send', responses=CONFLICT)
def send(order_id: uuid.UUID, body: OrderEditIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """Admin: approves a request as reviewed and sends it to the showroom."""
    return OrderOut.from_model(service.send(session, user, order_id, body))


@router.post('/{order_id}/reject', responses=CONFLICT)
def reject(order_id: uuid.UUID, body: NoteIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """Admin: turns a request down, with a reason."""
    return OrderOut.from_model(service.reject(session, user, order_id, body.note))


@router.post('/{order_id}/cancel', responses=CONFLICT)
def cancel(order_id: uuid.UUID, user: CurrentUser, session: DbSession) -> OrderOut:
    """The showroom withdraws its request before it is sent."""
    return OrderOut.from_model(service.cancel(session, user, order_id))


@router.post('/{order_id}/receive', responses=CONFLICT)
def receive(order_id: uuid.UUID, body: ReceiveIn, user: CurrentUser, session: DbSession) -> OrderOut:
    """The showroom counted the delivery in: the counted quantities are added to its stock."""
    return OrderOut.from_model(service.receive(session, user, order_id, body))
