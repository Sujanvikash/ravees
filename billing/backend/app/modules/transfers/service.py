import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.locations import repository as locations
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.stock.models import StockLevel
from app.modules.users.models import User

from .models import StockReturn
from .schemas import StockReturnIn, StockReturnReceiveIn


def list_returns(session: Session, user: User, location: str | None = None) -> Sequence[StockReturn]:
    stmt = select(StockReturn).order_by(StockReturn.created_at)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(StockReturn.location_id == location_id)
    return session.scalars(stmt).all()


def _log(record: StockReturn, by: str, action: str, note: str, at: datetime) -> None:
    entry = {'at': at.isoformat(), 'by': by, 'action': action, **({'note': note} if note else {})}
    record.history = [*record.history, entry]
    record.updated_at = at


def send_back(session: Session, user: User, data: StockReturnIn, *, at: datetime | None = None) -> StockReturn:
    """A showroom sends items back to the admin. They leave its stock now; it can't send more than it has."""
    if user.is_admin or not user.location_id:
        raise Forbidden('Stock is sent back from a showroom: sign in as the showroom.')
    if existing := session.get(StockReturn, data.id):
        if existing.location_id != user.location_id:
            raise Conflict('That return id is already used.')
        return existing
    location = locations.get(session, user.location_id)
    assert location is not None

    wanted: dict[str, int] = {}
    for line in data.lines:
        code = line.code.strip().upper()
        wanted[code] = wanted.get(code, 0) + line.qty
    catalogue = products.by_codes(session, wanted)
    unknown = sorted(set(wanted) - set(catalogue))
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    have = {
        level.code: level.qty
        for level in session.scalars(
            select(StockLevel)
            .where(StockLevel.location_id == location.id, StockLevel.code.in_(wanted))
            .with_for_update()
        )
    }
    for code, qty in wanted.items():
        if qty > max(have.get(code, 0), 0):
            raise InvalidInput(f'Only {max(have.get(code, 0), 0)} of {code} in stock at {location.city}.')

    at = at or clock.now()
    note = data.note.strip()
    record = StockReturn(
        id=data.id,
        number=numbering.next_stock_return_no(session, location.id),
        location_id=location.id,
        status='sent',
        reason=data.reason,
        note=note,
        lines=[
            {'code': c, 'name': catalogue[c].name, 'qty': q, 'rate': float(catalogue[c].cost)}
            for c, q in wanted.items()
        ],
        counted=None,
        history=[],
        created_at=at,
        updated_at=at,
    )
    _log(record, location.city, 'sent', note, at)
    session.add(record)
    stock.adjust(session, location.id, {c: -q for c, q in wanted.items()})
    session.commit()
    return record


def receive(
    session: Session, user: User, return_id: uuid.UUID, data: StockReturnReceiveIn, *, at: datetime | None = None
) -> StockReturn:
    """The admin counts a showroom's returned stock in."""
    if not user.is_admin:
        raise Forbidden()
    record = session.get(StockReturn, return_id, with_for_update=True)
    if not record:
        raise NotFound('No such stock return.')
    if record.status != 'sent':
        raise Conflict(f'{record.number} is already {record.status}.')
    on_it = {line['code'] for line in record.lines}
    counted: dict[str, int] = {}
    for line in data.counted:
        code = line.code.strip().upper()
        if code not in on_it:
            raise InvalidInput(f'{code} isn’t on {record.number}.')
        counted[code] = counted.get(code, 0) + line.qty
    record.status = 'received'
    record.counted = [{'code': c, 'qty': q} for c, q in counted.items() if q > 0]
    _log(record, 'Admin', 'received', data.note.strip(), at or clock.now())
    session.commit()
    return record
