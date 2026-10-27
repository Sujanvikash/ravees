import uuid
from collections.abc import Sequence
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.numbering import service as numbering
from app.modules.sales import service as sales
from app.modules.sales.models import Sale
from app.modules.sales.schemas import SaleIn
from app.modules.stock import repository as stock
from app.modules.system import settings as app_settings
from app.modules.users.models import User

from .models import SaleReturn
from .schemas import ReturnableLine, ReturnIn

ONLY_SHOWROOM = 'Returns are taken at the showroom counter: sign in as the showroom.'


def list_returns(
    session: Session, user: User, location: str | None = None, since: datetime | None = None
) -> Sequence[SaleReturn]:
    stmt = select(SaleReturn).order_by(SaleReturn.at)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(SaleReturn.location_id == location_id)
    if since:
        stmt = stmt.where(SaleReturn.at >= since)
    return session.scalars(stmt).unique().all()


def _find_sale(session: Session, user: User, sale_id: uuid.UUID | None, bill_no: str | None) -> Sale:
    sale = None
    if sale_id:
        sale = session.get(Sale, sale_id)
    elif bill_no:
        sale = session.scalar(select(Sale).where(Sale.bill_no == bill_no.strip().upper()))
    if not sale or (not user.is_admin and sale.location_id != user.location_id):
        raise NotFound('No bill with that number at this showroom.')
    return sale


def returned_so_far(session: Session, sale_id: uuid.UUID) -> dict[str, int]:
    out: dict[str, int] = {}
    for r in session.scalars(select(SaleReturn).where(SaleReturn.sale_id == sale_id)).unique():
        for line in r.lines:
            out[line['code']] = out.get(line['code'], 0) + line['qty']
    return out


def returnable_until(session: Session, sale: Sale) -> datetime | None:
    days = app_settings.get(session).return_days
    return sale.at + timedelta(days=days) if days else None


def returnable(session: Session, user: User, sale_id: uuid.UUID | None, bill_no: str | None):
    """A bill with what can still come back of each line."""
    sale = _find_sale(session, user, sale_id, bill_no)
    done = returned_so_far(session, sale.id)
    lines = [
        ReturnableLine(code=ln.code, name=ln.name, sold=ln.qty, returned=done.get(ln.code, 0), price=float(ln.price))
        for ln in sale.lines
    ]
    until = returnable_until(session, sale)
    return sale, lines, until, bool(until and clock.now() <= until)


def create_return(
    session: Session, user: User, data: ReturnIn, *, at: datetime | None = None
) -> tuple[SaleReturn, Sale | None]:
    """Takes goods back against a bill: they go back into the showroom's stock and get a credit note. A return
    refunds their value in cash. An exchange makes the new bill at the same time, with the returned value off
    it; any of the value the new bill doesn't use is refunded in cash. All in one transaction."""
    if user.is_admin or not user.location_id:
        raise Forbidden(ONLY_SHOWROOM)
    if existing := session.get(SaleReturn, data.id):
        if existing.location_id != user.location_id:
            raise Conflict('That return id is already used.')
        return existing, existing.exchange_sale

    sale = _find_sale(session, user, data.sale_id, data.bill_no)
    at = at or clock.now()
    until = returnable_until(session, sale)
    if until is None:
        raise Forbidden('Returns and exchanges are switched off (Settings).')
    if at > until:
        raise InvalidInput(f'{sale.bill_no} is past its return window (until {until.astimezone(clock.IST):%d %b %Y}).')

    sold = {ln.code: ln for ln in sale.lines}
    done = returned_so_far(session, sale.id)
    wanted: dict[str, int] = {}
    for line in data.lines:
        code = line.code.strip().upper()
        if code not in sold:
            raise InvalidInput(f'{code} isn’t on {sale.bill_no}.')
        wanted[code] = wanted.get(code, 0) + line.qty
    for code, qty in wanted.items():
        left = sold[code].qty - done.get(code, 0)
        if qty > left:
            raise InvalidInput(f'Only {left} of {code} can still come back on {sale.bill_no}.')

    lines = [
        {'code': c, 'name': sold[c].name, 'qty': q, 'price': float(sold[c].price), 'gst': float(sold[c].gst)}
        for c, q in wanted.items()
    ]
    value = sum((sold[c].price * q for c, q in wanted.items()), Decimal(0))
    amount = value.quantize(Decimal(1), ROUND_HALF_UP)
    return_no = numbering.next_return_no(session, user.location_id, at)

    new_sale = None
    refund = amount
    if data.exchange:
        new_sale = sales.create_sale(
            session,
            user,
            SaleIn(
                id=data.exchange.id,
                lines=data.exchange.lines,
                phone=sale.phone,
                name=sale.name,
                payment=data.exchange.payment,
            ),
            at=at,
            credit=amount,
            credit_note=return_no,
            commit=False,
        )
        refund = max(amount - Decimal(str(new_sale.totals['payable'])), Decimal(0))

    record = SaleReturn(
        id=data.id,
        return_no=return_no,
        sale_id=sale.id,
        location_id=user.location_id,
        at=at,
        kind='exchange' if new_sale else 'return',
        reason=data.reason.strip(),
        lines=lines,
        amount=amount,
        refund=refund,
        exchange_sale_id=new_sale.id if new_sale else None,
        created_by=user.username,
    )
    session.add(record)
    stock.adjust(session, user.location_id, wanted)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        if existing := session.get(SaleReturn, data.id):
            return existing, existing.exchange_sale
        raise
    session.refresh(record)
    return record, new_sale
