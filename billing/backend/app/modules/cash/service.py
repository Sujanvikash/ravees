from collections.abc import Sequence
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput
from app.modules.auth.access import acting_location, visible_location
from app.modules.returns.models import SaleReturn
from app.modules.sales.models import Sale
from app.modules.sales.service import cash_in
from app.modules.users.models import User

from .models import CashClose
from .schemas import CloseIn, CloseOut, DayOut

NOTES = {'2000', '500', '200', '100', '50', '20', '10', '5', '2', '1'}


def today() -> date:
    return clock.now().astimezone(clock.IST).date()


def _bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(0), clock.IST)
    return start, start + timedelta(days=1)


def _figures(session: Session, location_id: str, day: date) -> dict:
    start, end = _bounds(day)
    sales = session.scalars(select(Sale).where(Sale.location_id == location_id, Sale.at >= start, Sale.at < end)).all()
    refunds = session.scalars(
        select(SaleReturn.refund).where(
            SaleReturn.location_id == location_id, SaleReturn.at >= start, SaleReturn.at < end
        )
    ).all()
    cash = sum((cash_in(s.payment) for s in sales), Decimal(0))
    upi = Decimal(0)
    card = Decimal(0)
    for s in sales:
        p = s.payment
        if p.get('method') == 'upi':
            upi += Decimal(str(p['received']))
        elif p.get('method') == 'card':
            card += Decimal(str(p['received']))
        elif p.get('method') == 'split' and p.get('split'):
            upi += Decimal(str(p['split'].get('upi', 0)))
    return {'bills': len(sales), 'cash': cash, 'refunds': sum(refunds, Decimal(0)), 'upi': upi, 'card': card}


def _last_float(session: Session, location_id: str, before: date) -> Decimal:
    last = session.scalar(
        select(CashClose)
        .where(CashClose.location_id == location_id, CashClose.day < before)
        .order_by(CashClose.day.desc())
        .limit(1)
    )
    return last.float_next if last else Decimal(0)


def get_day(session: Session, user: User, location: str | None, day: date | None) -> DayOut:
    """The day's cash so far for one showroom, and its close if it has been closed."""
    loc = acting_location(session, user, location)
    day = day or today()
    closed = session.scalar(select(CashClose).where(CashClose.location_id == loc.id, CashClose.day == day))
    f = _figures(session, loc.id, day)
    opening = closed.opening if closed else _last_float(session, loc.id, day)
    return DayOut(
        location=loc.id,
        day=day,
        opening=float(opening),
        bills=f['bills'],
        cash_sales=float(f['cash']),
        cash_refunds=float(f['refunds']),
        upi=float(f['upi']),
        card=float(f['card']),
        expected=float(opening + f['cash'] - f['refunds']),
        closed=CloseOut.from_model(closed) if closed else None,
    )


def list_closes(
    session: Session, user: User, location: str | None = None, since: date | None = None
) -> Sequence[CashClose]:
    stmt = select(CashClose).order_by(CashClose.day.desc(), CashClose.location_id)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(CashClose.location_id == location_id)
    if since:
        stmt = stmt.where(CashClose.day >= since)
    return session.scalars(stmt).all()


def close_day(session: Session, user: User, data: CloseIn, *, at: datetime | None = None) -> CashClose:
    """The showroom's count at the end of the day. Once a day is closed it stays as counted; the admin sees the
    difference."""
    if user.is_admin or not user.location_id:
        raise Forbidden('The cash is counted at the showroom: sign in as the showroom.')
    day = data.day or today()
    if day > today():
        raise InvalidInput('That day hasn’t come yet.')
    bad = sorted(set(data.denominations) - NOTES)
    if bad or any(n < 0 for n in data.denominations.values()):
        raise InvalidInput('Count notes and coins as ₹2000, 500, 200, 100, 50, 20, 10, 5, 2 or 1.')
    if data.float_next > data.counted:
        raise InvalidInput('The cash kept for tomorrow can’t be more than the cash counted.')
    if session.scalar(select(CashClose.id).where(CashClose.location_id == user.location_id, CashClose.day == day)):
        raise Conflict(f'{day:%d %b %Y} is already closed.')

    f = _figures(session, user.location_id, day)
    opening = Decimal(str(data.opening))
    counted = Decimal(str(data.counted))
    expected = opening + f['cash'] - f['refunds']
    record = CashClose(
        location_id=user.location_id,
        day=day,
        opening=opening,
        cash_sales=f['cash'],
        cash_refunds=f['refunds'],
        expected=expected,
        counted=counted,
        difference=counted - expected,
        float_next=Decimal(str(data.float_next)),
        other={'bills': f['bills'], 'upi': float(f['upi']), 'card': float(f['card'])},
        denominations={k: v for k, v in data.denominations.items() if v},
        note=data.note.strip(),
        by=user.username,
        at=at or clock.now(),
    )
    session.add(record)
    session.commit()
    return record
