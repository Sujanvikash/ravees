from datetime import datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.clock import financial_year
from app.modules.locations import repository as locations

from .models import NumberSeries

BILL = 'bill'
QUOTE = 'quote'
ORDER = 'order'
RETURN = 'return'
STOCK_RETURN = 'stock-return'


def take_next(session: Session, location_id: str, kind: str, period: str = '') -> int:
    """Uses up the next number of a series and returns it (1 for a new series). One INSERT ... ON CONFLICT DO
    UPDATE ... RETURNING, so the row stays locked until the caller commits and two counters never get the same
    number."""
    stmt = insert(NumberSeries).values(location_id=location_id, kind=kind, period=period, next_no=2)
    stmt = stmt.on_conflict_do_update(
        index_elements=[NumberSeries.location_id, NumberSeries.kind, NumberSeries.period],
        set_={'next_no': NumberSeries.next_no + 1},
    ).returning(NumberSeries.next_no - 1)
    return session.execute(stmt).scalar_one()


def _prefix(session: Session, location_id: str) -> str:
    location = locations.get(session, location_id)
    assert location is not None, location_id
    return location.bill_prefix


def next_bill_no(session: Session, location_id: str, at: datetime) -> tuple[str, int]:
    """CHN/26-27/00184: the showroom's prefix, the financial year and its running number."""
    year = financial_year(at)
    seq = take_next(session, location_id, BILL, year)
    return f'{_prefix(session, location_id)}/{year}/{seq:05d}', seq


def next_quote_no(session: Session, location_id: str, at: datetime) -> str:
    """QT-CHN/26-27/00012: numbered on their own, apart from the bills."""
    year = financial_year(at)
    seq = take_next(session, location_id, QUOTE, year)
    return f'QT-{_prefix(session, location_id)}/{year}/{seq:05d}'


def next_order_no(session: Session, location_id: str) -> str:
    """PO-CHN-0007: the showroom's prefix and its running order count."""
    seq = take_next(session, location_id, ORDER)
    return f'PO-{_prefix(session, location_id)}-{seq:04d}'


def next_return_no(session: Session, location_id: str, at: datetime) -> str:
    """CN-CHN/26-27/00003: a credit note for goods a customer brought back, numbered per financial year."""
    year = financial_year(at)
    seq = take_next(session, location_id, RETURN, year)
    return f'CN-{_prefix(session, location_id)}/{year}/{seq:05d}'


def next_stock_return_no(session: Session, location_id: str) -> str:
    """SR-CHN-0002: stock a showroom sends back to the admin."""
    seq = take_next(session, location_id, STOCK_RETURN)
    return f'SR-{_prefix(session, location_id)}-{seq:04d}'
