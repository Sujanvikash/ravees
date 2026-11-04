import json
import uuid
from collections.abc import Sequence
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput
from app.modules.auth.access import acting_location, visible_location
from app.modules.returns.models import SaleReturn
from app.modules.sales.models import Sale, SaleCollection
from app.modules.sales.service import takings
from app.modules.system import repository as system_repo
from app.modules.users.models import User

from .models import CashClose
from .schemas import CloseIn, CloseOut, DayOut

NOTES = {'2000', '500', '200', '100', '50', '20', '10', '5', '2', '1'}

AUTO_BY = 'auto'  # the `by` on a day the server closed itself, so the admin can tell it apart from a counted close
AUTO_NOTE = 'Auto-closed at the end of the day — the drawer was not counted.'
AUTO_KEY = 'cash_auto_closed'  # {location_id: "YYYY-MM-DD"}: the last day already considered for auto-close
MAX_AUTO_DAYS = 31  # on a long gap, never reach back further than this


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
    # balances paid today on credit bills (from any day) count with the day's takings, by how they were paid
    collections = session.scalars(
        select(SaleCollection).where(
            SaleCollection.location_id == location_id, SaleCollection.at >= start, SaleCollection.at < end
        )
    ).all()
    cash = upi = card = Decimal(0)
    for payment in [s.payment for s in sales] + [c.payment for c in collections]:
        c, u, k = takings(payment)
        cash, upi, card = cash + c, upi + u, card + k
    return {
        'bills': len(sales),
        'cash': cash,
        'refunds': sum(refunds, Decimal(0)),
        'upi': upi,
        'card': card,
        'collections': len(collections),
        'collected': sum((c.amount for c in collections), Decimal(0)),
    }


def _other(f: dict) -> dict:
    """The day's other figures kept on a close, for reference."""
    other = {'bills': f['bills'], 'upi': float(f['upi']), 'card': float(f['card'])}
    if f['collections']:
        other |= {'collections': f['collections'], 'collected': float(f['collected'])}
    return other


def _last_float(session: Session, location_id: str, before: date) -> Decimal:
    last = session.scalar(
        select(CashClose)
        .where(CashClose.location_id == location_id, CashClose.day < before)
        .order_by(CashClose.day.desc())
        .limit(1)
    )
    return last.float_next if last else Decimal(0)


def _auto_marker(session: Session) -> dict[str, str]:
    try:
        marker = json.loads(system_repo.get_value(session, AUTO_KEY, '{}'))
        return marker if isinstance(marker, dict) else {}
    except ValueError:
        return {}


def _end_of_day(day: date) -> datetime:
    return _bounds(day)[1] - timedelta(seconds=1)


def auto_close(session: Session, location_id: str) -> None:
    """Close any whole day that ended for this showroom without a count, so a shift never stays open past its
    day. The server can't count the drawer, so it takes it as matching (no difference) and carries the same float
    forward; the note and `by` say it closed itself. Each day is considered once (tracked per showroom), so a day
    an admin deliberately reopens is not closed again, and history before the showroom's first visit is left
    alone. Called lazily when the showroom reads its cash, since there is no scheduler."""
    t = today()
    yesterday = t - timedelta(days=1)
    marker = _auto_marker(session)
    seen = marker.get(location_id)
    if seen is None:
        # first time we see this showroom: start watching from now on, never reach back into old days
        marker[location_id] = yesterday.isoformat()
        system_repo.set_value(session, AUTO_KEY, json.dumps(marker))
        session.commit()
        return
    try:
        last = date.fromisoformat(seen)
    except ValueError:
        last = yesterday
    day = max(last + timedelta(days=1), t - timedelta(days=MAX_AUTO_DAYS))
    changed = False
    while day < t:
        already = session.scalar(
            select(CashClose.id).where(CashClose.location_id == location_id, CashClose.day == day)
        )
        f = _figures(session, location_id, day)
        if not already and (f['bills'] or f['collections']):
            opening = _last_float(session, location_id, day)
            expected = opening + f['cash'] - f['refunds']
            session.add(
                CashClose(
                    location_id=location_id,
                    day=day,
                    opening=opening,
                    cash_sales=f['cash'],
                    cash_refunds=f['refunds'],
                    expected=expected,
                    counted=expected,
                    difference=Decimal(0),
                    float_next=opening,
                    other=_other(f) | {'auto': True},
                    denominations={},
                    note=AUTO_NOTE,
                    by=AUTO_BY,
                    at=_end_of_day(day),
                )
            )
            changed = True
        day += timedelta(days=1)
    if marker.get(location_id) != yesterday.isoformat():
        marker[location_id] = yesterday.isoformat()
        system_repo.set_value(session, AUTO_KEY, json.dumps(marker))
        changed = True
    if changed:
        session.commit()


def get_day(session: Session, user: User, location: str | None, day: date | None) -> DayOut:
    """The day's cash so far for one showroom, and its close if it has been closed."""
    loc = acting_location(session, user, location)
    if not user.is_admin and user.location_id:
        auto_close(session, user.location_id)
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
        collected=float(f['collected']),
        collections=f['collections'],
        expected=float(opening + f['cash'] - f['refunds']),
        closed=CloseOut.from_model(closed) if closed else None,
    )


def list_closes(
    session: Session, user: User, location: str | None = None, since: date | None = None
) -> Sequence[CashClose]:
    if not user.is_admin and user.location_id:
        auto_close(session, user.location_id)
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
        other=_other(f),
        denominations={k: v for k, v in data.denominations.items() if v},
        note=data.note.strip(),
        by=user.username,
        at=at or clock.now(),
    )
    session.add(record)
    session.commit()
    return record


def reopen_day(session: Session, user: User, close_id: uuid.UUID) -> DayOut:
    """Undo a cash close that was made by mistake, so the showroom can count and close the day again. A showroom
    may reopen only its own close; the admin may reopen any. Only the showroom's most recent close can be
    reopened, so the float carried on to later days stays correct — reopen those first if need be."""
    close = session.get(CashClose, close_id)
    if not close:
        raise InvalidInput('That cash close no longer exists.')
    if not user.is_admin and close.location_id != user.location_id:
        raise Forbidden('A showroom can only reopen its own cash close.')
    later = session.scalar(
        select(CashClose.id).where(CashClose.location_id == close.location_id, CashClose.day > close.day)
    )
    if later:
        raise Conflict('A later day is already closed for this showroom; reopen that one first.')
    location_id, day = close.location_id, close.day
    session.delete(close)
    session.commit()
    return get_day(session, user, location_id, day)
