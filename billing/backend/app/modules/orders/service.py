import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, NotFound
from app.modules.auth.access import acting_location, by_label, visible_location
from app.modules.locations import repository as locations
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.stock.service import merge_lines
from app.modules.users.models import User

from .models import PurchaseOrder, Status
from .schemas import OrderEditIn, OrderIn, OrderLineIn

ONLY_SHOWROOM = 'Only the showroom that requested it can do this.'


def list_orders(session: Session, user: User, location: str | None = None) -> Sequence[PurchaseOrder]:
    stmt = select(PurchaseOrder).order_by(PurchaseOrder.created_at)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(PurchaseOrder.location_id == location_id)
    return session.scalars(stmt).all()


def _get(session: Session, user: User, order_id: uuid.UUID) -> PurchaseOrder:
    """The order, locked until the caller commits so two people can't move it on at once. A showroom only finds
    its own orders."""
    order = session.get(PurchaseOrder, order_id, with_for_update=True)
    if not order or (not user.is_admin and order.location_id != user.location_id):
        raise NotFound('No such purchase order.')
    return order


def _by(session: Session, user: User) -> str:
    return by_label(user, None if user.is_admin else locations.get(session, user.location_id))


def _log(order: PurchaseOrder, by: str, action: str, note: str, at: datetime) -> None:
    entry = {'at': at.isoformat(), 'by': by, 'action': action, **({'note': note} if note else {})}
    order.history = [*order.history, entry]  # a new list, so the change is saved
    order.updated_at = at


def _lines(session: Session, lines: Sequence[OrderLineIn]) -> list[dict]:
    return merge_lines(lines, products.by_codes(session, (line.code for line in lines)))


def _expect(order: PurchaseOrder, status: Status, action: str) -> None:
    if order.status != status:
        raise Conflict(f'{order.number} is {order.status}, so it can’t be {action}.')


def create_order(session: Session, user: User, data: OrderIn, *, at: datetime | None = None) -> PurchaseOrder:
    """A showroom's request for stock, to the admin. The admin answers it with an invoice (or rejects it)."""
    if user.is_admin:
        raise Forbidden(ONLY_SHOWROOM)
    at = at or clock.now()
    location = acting_location(session, user, data.location)
    note = data.note.strip()
    order = PurchaseOrder(
        id=uuid.uuid4(),
        number=numbering.next_order_no(session, location.id),
        location_id=location.id,
        status=Status.REQUESTED,
        lines=_lines(session, data.lines),
        note=note,
        counted=None,
        history=[],
        created_at=at,
        updated_at=at,
    )
    _log(order, by_label(user, location), 'requested', note, at)
    session.add(order)
    session.commit()
    return order


def update_request(session: Session, user: User, order_id: uuid.UUID, data: OrderEditIn) -> PurchaseOrder:
    """The showroom changes its request, or the admin reviews it, before an invoice answers it. The admin's note goes
    in the history only; the request keeps the showroom's own."""
    order = _get(session, user, order_id)
    _expect(order, Status.REQUESTED, 'edited')
    note = data.note.strip()
    order.lines = _lines(session, data.lines)
    if not user.is_admin:
        order.note = note or order.note
    _log(order, _by(session, user), 'reviewed' if user.is_admin else 'updated', note, clock.now())
    session.commit()
    return order


def reject(
    session: Session, user: User, order_id: uuid.UUID, note: str, *, at: datetime | None = None
) -> PurchaseOrder:
    """The admin turns a request down, with a reason."""
    if not user.is_admin:
        raise Forbidden()
    order = _get(session, user, order_id)
    _expect(order, Status.REQUESTED, 'rejected')
    order.status = Status.REJECTED
    _log(order, 'Admin', 'rejected', note.strip(), at or clock.now())
    session.commit()
    return order


def cancel(session: Session, user: User, order_id: uuid.UUID, *, at: datetime | None = None) -> PurchaseOrder:
    """The showroom withdraws its request before the admin sends it."""
    if user.is_admin:
        raise Forbidden(ONLY_SHOWROOM)
    order = _get(session, user, order_id)
    _expect(order, Status.REQUESTED, 'cancelled')
    order.status = Status.CANCELLED
    _log(order, _by(session, user), 'cancelled', '', at or clock.now())
    session.commit()
    return order
