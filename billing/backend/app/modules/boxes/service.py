import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.locations import repository as locations
from app.modules.locations.constants import WAREHOUSE_ID
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.users.models import User

from .models import Box
from .schemas import BoxesIn, BoxReceiveIn, BoxTagIn


def list_boxes(session: Session, user: User, location: str | None = None) -> Sequence[Box]:
    """Boxes, oldest first: for a showroom the ones tagged for it, for the admin all (or one showroom's)."""
    stmt = select(Box).order_by(Box.created_at, Box.box_no)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(Box.location_id == location_id)
    return session.scalars(stmt).all()


def _log(box: Box, by: str, action: str, note: str, at: datetime) -> None:
    entry = {'at': at.isoformat(), 'by': by, 'action': action, **({'note': note} if note else {})}
    box.history = [*box.history, entry]
    box.updated_at = at


def _showroom(session: Session, location: str | None) -> str | None:
    """The showroom a box is tagged for, checked: None leaves it untagged; the admin's warehouse is not one."""
    if not location:
        return None
    found = locations.get(session, location)
    if not found or found.id == WAREHOUSE_ID:
        raise InvalidInput(f'No showroom “{location}”.')
    return found.id


def _admin(user: User) -> None:
    if not user.is_admin:
        raise Forbidden('Only the admin enters boxes.')


def save_boxes(session: Session, user: User, data: BoxesIn, *, at: datetime | None = None) -> list[Box]:
    """Adds boxes, or edits ones still packed (same id). Every product code must be in the product list and every
    box number used once; if anything is wrong nothing is saved, and the error names the boxes to fix."""
    _admin(user)
    at = at or clock.now()

    numbers: dict[str, uuid.UUID] = {}
    for item in data.boxes:
        box_no = item.box_no.strip().upper()
        if box_no in numbers and numbers[box_no] != item.id:
            raise InvalidInput(f'Box {box_no} is in the list twice.')
        numbers[box_no] = item.id
    taken = {
        b.box_no: b.id
        for b in session.scalars(select(Box).where(Box.box_no.in_(numbers), Box.id.not_in(numbers.values())))
    }
    if taken:
        raise Conflict(f'Already entered: box {", ".join(sorted(taken))}.')

    catalogue = products.by_codes(session, {line.code for item in data.boxes for line in item.lines})
    unknown = {}
    for item in data.boxes:
        missing = sorted({line.code.strip().upper() for line in item.lines} - set(catalogue))
        if missing:
            unknown[item.box_no.strip().upper()] = missing
    if unknown:
        listed = '; '.join(f'box {b}: {", ".join(codes)}' for b, codes in list(unknown.items())[:10])
        more = f' and {len(unknown) - 10} more boxes' if len(unknown) > 10 else ''
        raise InvalidInput(f'Not in the product list — {listed}{more}.')

    saved = []
    for item in data.boxes:
        box = session.get(Box, item.id, with_for_update=True)
        if box and box.status != 'packed':
            raise Conflict(f'Box {box.box_no} is already {box.status}; it can’t be changed.')
        wanted: dict[str, int] = {}
        for line in item.lines:
            code = line.code.strip().upper()
            wanted[code] = wanted.get(code, 0) + line.qty
        fields = {
            'box_no': item.box_no.strip().upper(),
            'stock_no': item.stock_no.strip().upper(),
            'shipment': ' '.join(item.shipment.split()),
            'supplier': ' '.join(item.supplier.split()),
            'location_id': _showroom(session, item.location),
            'lines': [{'code': c, 'name': catalogue[c].name, 'qty': q} for c, q in wanted.items()],
        }
        if box:
            for name, value in fields.items():
                setattr(box, name, value)
            _log(box, 'Admin', 'edited', '', at)
        else:
            box = Box(id=item.id, status='packed', counted=None, history=[], created_at=at, updated_at=at, **fields)
            _log(box, 'Admin', 'packed', '', at)
            session.add(box)
        saved.append(box)
    session.commit()
    return saved


def tag(session: Session, user: User, data: BoxTagIn, *, at: datetime | None = None) -> list[Box]:
    """Tags packed boxes for a showroom (or takes the tag off). A box already received keeps its showroom."""
    _admin(user)
    at = at or clock.now()
    location_id = _showroom(session, data.location)
    boxes = session.scalars(select(Box).where(Box.id.in_(data.ids)).with_for_update()).all()
    if len(boxes) != len(set(data.ids)):
        raise NotFound('Some of those boxes no longer exist.')
    received = sorted(b.box_no for b in boxes if b.status != 'packed')
    if received:
        raise Conflict(f'Already received: box {", ".join(received)}.')
    for box in boxes:
        if box.location_id != location_id:
            box.location_id = location_id
            _log(box, 'Admin', 'tagged' if location_id else 'untagged', location_id or '', at)
    session.commit()
    return list(boxes)


def delete(session: Session, user: User, box_id: uuid.UUID) -> None:
    """Removes a box entered by mistake. Only while packed: a received box is part of the stock history."""
    _admin(user)
    box = session.get(Box, box_id, with_for_update=True)
    if not box:
        raise NotFound('No such box.')
    if box.status != 'packed':
        raise Conflict(f'Box {box.box_no} is already {box.status}; it is kept.')
    session.delete(box)
    session.commit()


def receive(session: Session, user: User, box_id: uuid.UUID, data: BoxReceiveIn, *, at: datetime | None = None) -> Box:
    """The showroom the box is tagged for counts it in: what it counts goes into its stock. Differences from the
    box's list are kept on the box for the admin to see."""
    if user.is_admin or not user.location_id:
        raise Forbidden('A box is counted in at the showroom it was sent to.')
    box = session.get(Box, box_id, with_for_update=True)
    if not box or box.location_id != user.location_id:
        raise NotFound('That box isn’t tagged for this showroom.')
    if box.status != 'packed':
        raise Conflict(f'Box {box.box_no} is already {box.status}.')
    on_it = {line['code'] for line in box.lines}
    counted: dict[str, int] = {}
    for line in data.counted:
        code = line.code.strip().upper()
        if code not in on_it:
            raise InvalidInput(f'{code} isn’t in box {box.box_no}.')
        counted[code] = counted.get(code, 0) + line.qty
    location = locations.get(session, user.location_id)
    box.status = 'received'
    box.counted = [{'code': c, 'qty': q} for c, q in counted.items() if q > 0]
    _log(box, location.city if location else user.username, 'received', data.note.strip(), at or clock.now())
    stock.adjust(session, user.location_id, {c: q for c, q in counted.items() if q > 0})
    session.commit()
    return box
