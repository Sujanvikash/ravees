import base64
import binascii
import uuid
from collections.abc import Sequence
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.locations import repository as locations
from app.modules.locations.constants import HOME_STATE, WAREHOUSE_ID
from app.modules.locations.models import Location
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.stock.models import StockLevel
from app.modules.system import settings as app_settings
from app.modules.users.models import User

from .models import StockReturn
from .schemas import ReturnDocumentsIn, StockReturnIn, StockReturnReceiveIn

MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
CENT = Decimal('0.01')


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


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


def _issuer(session: Session, location: Location) -> dict:
    """The showroom as the return names it: its own Settings (Shop on the bill), blank where it has none (the
    frontend prints the built-in details there), and its GST state: its GSTIN's, else where the store is."""
    own = app_settings.get(session, location.id)
    gstin = own.gstin.strip().upper()
    state = gstin[:2] if gstin[:2].isdigit() else HOME_STATE.get(location.id, '')
    return {
        'name': own.store_name.strip(),
        'address': own.store_address.strip(),
        'phone': own.store_phone.strip(),
        'gstin': gstin,
        'state': state,
    }


def _kept(session: Session, location: Location, sent: dict[str, int]) -> list[dict]:
    """What the showroom still has and isn't sending at all. Its own products never came from the admin, so keeping
    them is no mismatch."""
    left = session.execute(
        select(StockLevel.code, StockLevel.qty).where(
            StockLevel.location_id == location.id, StockLevel.qty > 0, StockLevel.code.not_in(sent)
        )
    ).all()
    named = products.by_codes(session, (code for code, _ in left))
    kept = []
    for code, qty in sorted(left):
        if code not in named or named[code].shop_location_id:
            continue
        rate = _money(Decimal(named[code].cost))
        kept.append(
            {
                'code': code,
                'name': named[code].name,
                'qty': qty,
                'rate': float(rate),
                'amount': float(_money(rate * qty)),
            }
        )
    return kept


def send_back(session: Session, user: User, data: StockReturnIn, *, at: datetime | None = None) -> StockReturn:
    """A showroom sends items back to the admin. They leave its stock now; it can't send more than it has. The goods
    go back at their cost price (D.Rate) and no GST: a purchase return is valued at D.Rate only. What it had of
    each product is kept on its line (held) and, at the end of the season, what it had and isn't sending at all
    (kept, also at D.Rate): so the admin sees how much was and wasn't returned, in units and in value."""
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
            raise InvalidInput(f'Only {max(have.get(code, 0), 0)} of {code} in stock at {location.label}.')

    lines = []
    for code, qty in wanted.items():
        product = catalogue[code]
        rate = _money(Decimal(product.cost))
        lines.append(
            {
                'code': code,
                'name': product.name,
                'hsn': product.hsn,
                'qty': qty,
                'held': max(have.get(code, 0), 0),
                'rate': float(rate),
                'amount': float(_money(rate * qty)),
            }
        )

    at = at or clock.now()
    note = data.note.strip()
    record = StockReturn(
        id=data.id,
        number=numbering.next_stock_return_no(session, location.id),
        location_id=location.id,
        status='sent',
        reason=data.reason,
        note=note,
        lines=lines,
        counted=None,
        kept=_kept(session, location, wanted) if data.reason == 'end-of-season' else None,
        issuer=_issuer(session, location),
        subtotal=sum((Decimal(str(line['amount'])) for line in lines), Decimal(0)),
        lr_no=data.lr_no.strip(),
        vehicle_no=data.vehicle_no.strip().upper(),
        cartons=data.cartons,
        eway_no='',
        doc_name='',
        doc_data=None,
        history=[],
        created_at=at,
        updated_at=at,
    )
    _log(record, location.label, 'sent', note, at)
    session.add(record)
    stock.adjust(session, location.id, {c: -q for c, q in wanted.items()})
    session.commit()
    return record


def receive(
    session: Session, user: User, return_id: uuid.UUID, data: StockReturnReceiveIn, *, at: datetime | None = None
) -> StockReturn:
    """The admin counts a showroom's returned stock in: what arrived goes into the admin's own stock."""
    if not user.is_admin:
        raise Forbidden()
    record = session.get(StockReturn, return_id, with_for_update=True)
    if not record:
        raise NotFound('No such purchase return.')
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
    stock.adjust(session, WAREHOUSE_ID, {c: q for c, q in counted.items() if q > 0})
    session.commit()
    return record


def _visible(session: Session, user: User, return_id: uuid.UUID, *, lock: bool = False) -> StockReturn:
    """The return, if this login may see it: its showroom's own, or any for the admin."""
    record = session.get(StockReturn, return_id, with_for_update=lock)
    if not record or (not user.is_admin and record.location_id != user.location_id):
        raise NotFound('No such purchase return.')
    return record


def set_documents(
    session: Session, user: User, return_id: uuid.UUID, data: ReturnDocumentsIn, *, at: datetime | None = None
) -> StockReturn:
    """Records the return's e-way bill number and transport (LR no., vehicle, cartons), and keeps the e-way bill's
    PDF if one is sent. The showroom does it (it sends the goods), or the admin for it, any time after sending."""
    record = _visible(session, user, return_id, lock=True)
    if data.doc_base64:
        try:
            raw = base64.b64decode(data.doc_base64.split(',')[-1], validate=True)
        except (binascii.Error, ValueError):
            raise InvalidInput('The document could not be read; attach the PDF again.') from None
        if len(raw) > MAX_DOCUMENT_BYTES:
            raise InvalidInput('The document is over 2 MB.')
        if not raw.startswith(b'%PDF'):
            raise InvalidInput('That file isn’t a PDF; attach the e-way bill as a PDF.')
        record.doc_data = raw
        record.doc_name = data.doc_name.strip() or 'e-way-bill.pdf'
    eway = data.eway_no.strip().upper()
    record.eway_no = eway
    record.lr_no = data.lr_no.strip()
    record.vehicle_no = data.vehicle_no.strip().upper()
    record.cartons = data.cartons
    location = locations.get(session, record.location_id)
    by = 'Admin' if user.is_admin or location is None else location.label
    _log(record, by, 'documents', f'e-way bill {eway}' if eway else '', at or clock.now())
    session.commit()
    return record


def get_document(session: Session, user: User, return_id: uuid.UUID) -> tuple[bytes, str]:
    record = _visible(session, user, return_id)
    if record.doc_data is None:
        raise NotFound('No e-way bill kept for that return.')
    return record.doc_data, record.doc_name or 'e-way-bill.pdf'
