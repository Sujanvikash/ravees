from collections.abc import Sequence
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.locations import repository as locations
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.sales import bill
from app.modules.sales.schemas import check_customer
from app.modules.users.models import User

from .models import Quote
from .schemas import QuoteIn


def list_quotes(session: Session, user: User, location: str | None = None) -> Sequence[Quote]:
    stmt = select(Quote).order_by(Quote.at)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(Quote.location_id == location_id)
    return session.scalars(stmt).all()


def last_valid_day(at: datetime, until: date | None = None, days: int | None = None) -> date:
    """A quotation's last valid day: the date picked (today at the earliest, a year ahead at the latest), or `days`
    from `at` (an older app), or else 25 December, the season's end (a week from `at` once that has passed)."""
    today = at.astimezone(clock.IST).date()
    if until:
        if until < today:
            raise InvalidInput('That valid-until date has passed: pick today or a later date.')
        if until > today + timedelta(days=366):
            raise InvalidInput('A quotation can be valid for a year at most.')
        return until
    if days:
        return today + timedelta(days=days)
    christmas = date(today.year, 12, 25)
    return christmas if today <= christmas else today + timedelta(days=7)


def valid_until(last: date) -> datetime:
    """The end of the last valid day (IST)."""
    return datetime.combine(last, time(23, 59, 59), clock.IST)


def create_quote(session: Session, user: User, data: QuoteIn, *, at: datetime | None = None) -> Quote:
    """Saves a showroom's quotation, priced from the catalogue and numbered on its own (QT-CHN/26-27/00012)."""
    if user.is_admin or not user.location_id:
        raise Forbidden('Quotations are written at a showroom: sign in as the showroom.')
    if existing := session.get(Quote, data.id):
        if existing.location_id != user.location_id:
            raise Conflict('That quotation id is already used.')
        return existing
    try:
        name, phone = check_customer(data.name, data.phone)
    except ValueError as error:
        raise InvalidInput(str(error)) from None

    catalogue = products.by_codes(session, (line.code for line in data.lines))
    lines = bill.bill_lines(((line.code, line.qty) for line in data.lines), catalogue)
    at = at or clock.now()
    last_day = last_valid_day(at, data.valid_until, data.valid_days)
    location = locations.get(session, user.location_id)
    quote = Quote(
        id=data.id,
        quote_no=numbering.next_quote_no(session, user.location_id, at),
        location_id=user.location_id,
        at=at,
        by=location.label if location else user.username,
        name=name,
        phone=phone,
        valid_until=valid_until(last_day),
        note=data.note.strip(),
        company=' '.join(data.company.split()),
        address='\n'.join(ln.strip() for ln in data.address.splitlines() if ln.strip()),
        gstin=data.gstin,
        delivery_date=data.delivery_date,
        lines=[
            {'code': ln.code, 'name': ln.name, 'qty': ln.qty, 'price': float(ln.price), 'mrp': float(ln.mrp)}
            for ln in lines
        ],
        totals=bill.totals(lines),
        created_by=user.username,
    )
    session.add(quote)
    session.commit()
    return quote


def _own_quote(session: Session, user: User, quote_id) -> Quote:
    quote = session.get(Quote, quote_id)
    if not quote or (not user.is_admin and quote.location_id != user.location_id):
        raise NotFound('No such quotation.')
    return quote


def archive_quote(session: Session, user: User, quote_id) -> Quote:
    """Archives a quotation: it leaves the live list but is kept (it was never a bill, so nothing else changes).
    A showroom archives its own; the admin any. A quotation is never edited or deleted."""
    quote = _own_quote(session, user, quote_id)
    quote.archived_at = clock.now()
    session.commit()
    return quote


def unarchive_quote(session: Session, user: User, quote_id) -> Quote:
    """Brings an archived quotation back onto the live list."""
    quote = _own_quote(session, user, quote_id)
    quote.archived_at = None
    session.commit()
    return quote
