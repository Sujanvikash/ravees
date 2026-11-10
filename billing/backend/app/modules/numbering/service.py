import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.clock import financial_year
from app.modules.locations import repository as locations
from app.modules.locations.constants import WAREHOUSE_ID

from .models import NumberSeries

BILL = 'bill'
QUOTE = 'quote'
ORDER = 'order'
RETURN = 'return'
STOCK_RETURN = 'stock-return'
TRANSFER = 'transfer'
RECEIPT = 'receipt'
OFFLINE_COUNTER = 'offline-counter'
MAX_OFFLINE_COUNTERS = 99  # two digits in the bill number


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
    """CHN262700184: the showroom's prefix, the financial year and its running number — letters and digits only,
    no separators. The year (2627) keeps the number unique across financial years (the sequence resets each)."""
    year = financial_year(at).replace('-', '')
    seq = take_next(session, location_id, BILL, year)
    return f'{_prefix(session, location_id)}{year}{seq:05d}', seq


def next_offline_counter(session: Session, location_id: str) -> int | None:
    """A new counter number (1, 2…) for a browser at this showroom that may bill while the internet is down, or
    None once all 99 are used. Each browser gets its own, so two counters billing offline never clash."""
    counter = take_next(session, location_id, OFFLINE_COUNTER)
    return counter if counter <= MAX_OFFLINE_COUNTERS else None


def check_offline_bill_no(session: Session, location_id: str, bill_no: str, at: datetime) -> bool:
    """Whether `bill_no` is one a counter of this showroom could have given a bill made offline at `at`:
    CHN2627OF020015 is the showroom's prefix, the financial year, OF, the counter number (handed out by
    next_offline_counter) and that counter's own running number for the year."""
    year = financial_year(at).replace('-', '')
    match = re.fullmatch(rf'{re.escape(_prefix(session, location_id))}{year}OF(\d{{2}})(\d{{4}})', bill_no)
    if not match or int(match[1]) < 1 or int(match[2]) < 1:
        return False
    issued = session.scalar(
        select(NumberSeries.next_no).where(
            NumberSeries.location_id == location_id,
            NumberSeries.kind == OFFLINE_COUNTER,
            NumberSeries.period == '',
        )
    )
    return issued is not None and int(match[1]) < issued


def next_quote_no(session: Session, location_id: str, at: datetime) -> str:
    """QT-CHN262700012: numbered on their own, apart from the bills (the QT- marks it a quotation)."""
    year = financial_year(at).replace('-', '')
    seq = take_next(session, location_id, QUOTE, year)
    return f'QT-{_prefix(session, location_id)}{year}{seq:05d}'


def next_order_no(session: Session, location_id: str) -> str:
    """PO-CHN-0007: the showroom's prefix and its running order count."""
    seq = take_next(session, location_id, ORDER)
    return f'PO-{_prefix(session, location_id)}-{seq:04d}'


def next_return_no(session: Session, location_id: str, at: datetime) -> str:
    """CN-CHN262700003: a credit note for goods a customer brought back, numbered per financial year."""
    year = financial_year(at).replace('-', '')
    seq = take_next(session, location_id, RETURN, year)
    return f'CN-{_prefix(session, location_id)}{year}{seq:05d}'


def next_receipt_no(session: Session, location_id: str, at: datetime) -> str:
    """RC-CHN262700001: a payment received towards a credit bill's balance, numbered per financial year."""
    year = financial_year(at).replace('-', '')
    seq = take_next(session, location_id, RECEIPT, year)
    return f'RC-{_prefix(session, location_id)}{year}{seq:05d}'


def next_stock_return_no(session: Session, location_id: str) -> str:
    """PR-CHN-0002: stock a showroom sends back to the admin."""
    seq = take_next(session, location_id, STOCK_RETURN)
    return f'PR-{_prefix(session, location_id)}-{seq:04d}'


def next_invoice_no(session: Session) -> str:
    """INV-ADM-0001: an invoice the admin raises for stock going to a showroom, numbered on the admin's own series
    (the one that numbered them TI-ADM-0001 before)."""
    seq = take_next(session, WAREHOUSE_ID, TRANSFER)
    return f'INV-{_prefix(session, WAREHOUSE_ID)}-{seq:04d}'
