import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.locations.constants import WAREHOUSE_ID
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.stock.models import StockLevel
from app.modules.users.models import User

from .models import Box
from .schemas import BoxesIn


def list_boxes(session: Session, user: User) -> Sequence[Box]:
    """Every box, oldest first. Boxes are the admin's warehouse inventory: showrooms don't see them."""
    _admin(user)
    return session.scalars(select(Box).order_by(Box.created_at, Box.box_no)).all()


def _log(box: Box, by: str, action: str, note: str, at: datetime) -> None:
    entry = {'at': at.isoformat(), 'by': by, 'action': action, **({'note': note} if note else {})}
    box.history = [*box.history, entry]
    box.updated_at = at


def _admin(user: User) -> None:
    if not user.is_admin:
        raise Forbidden('Only the admin enters boxes.')


def adjust_warehouse(session: Session, deltas: dict[str, int]) -> None:
    """Adds each delta (negative to take off) to the admin's own stock. Refuses, naming each product, if that
    would leave the admin with less than none."""
    deltas = {code: qty for code, qty in deltas.items() if qty}
    if not deltas:
        return
    have = {
        level.code: level.qty
        for level in session.scalars(
            select(StockLevel)
            .where(StockLevel.location_id == WAREHOUSE_ID, StockLevel.code.in_(deltas))
            .with_for_update()
        )
    }
    short = [
        f'{code} (have {max(have.get(code, 0), 0)}, taking {-qty})'
        for code, qty in deltas.items()
        if have.get(code, 0) + qty < 0
    ]
    if short:
        raise InvalidInput(f'Not enough in the admin stock: {", ".join(short)}.')
    stock.adjust(session, WAREHOUSE_ID, deltas)


def save_boxes(session: Session, user: User, data: BoxesIn, *, at: datetime | None = None) -> list[Box]:
    """Adds boxes, or edits ones still in stock (same id); the items go into the admin's warehouse stock (an edit
    changes it by the difference). Every product code must be in the product list and every
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
    deltas: dict[str, int] = {}
    for item in data.boxes:
        box = session.get(Box, item.id, with_for_update=True)
        if box and box.status != 'in_stock':
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
            'lines': [{'code': c, 'name': catalogue[c].name, 'qty': q} for c, q in wanted.items()],
        }
        for line in box.lines if box else []:
            deltas[line['code']] = deltas.get(line['code'], 0) - line['qty']
        for code, qty in wanted.items():
            deltas[code] = deltas.get(code, 0) + qty
        if box:
            for name, value in fields.items():
                setattr(box, name, value)
            _log(box, 'Admin', 'edited', '', at)
        else:
            box = Box(id=item.id, status='in_stock', history=[], created_at=at, updated_at=at, **fields)
            _log(box, 'Admin', 'entered', '', at)
            session.add(box)
        saved.append(box)
    adjust_warehouse(session, deltas)
    session.commit()
    return saved


def delete(session: Session, user: User, box_id: uuid.UUID) -> None:
    """Removes a box entered by mistake, and its items from the warehouse stock. Only while it is in stock: a box
    on an invoice is part of the stock history."""
    _admin(user)
    box = session.get(Box, box_id, with_for_update=True)
    if not box:
        raise NotFound('No such box.')
    if box.status != 'in_stock':
        raise Conflict(f'Box {box.box_no} is already {box.status}; it is kept.')
    adjust_warehouse(session, {line['code']: -line['qty'] for line in box.lines})
    session.delete(box)
    session.commit()
