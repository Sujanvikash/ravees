from collections.abc import Sequence
from datetime import datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput
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


def valid_until(at: datetime, days: int) -> datetime:
    """The end of the last valid day (IST), `days` from `at`."""
    last = (at.astimezone(clock.IST) + timedelta(days=days)).date()
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
    location = locations.get(session, user.location_id)
    quote = Quote(
        id=data.id,
        quote_no=numbering.next_quote_no(session, user.location_id, at),
        location_id=user.location_id,
        at=at,
        by=location.city if location else user.username,
        name=name,
        phone=phone,
        valid_until=valid_until(at, data.valid_days),
        note=data.note.strip(),
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
