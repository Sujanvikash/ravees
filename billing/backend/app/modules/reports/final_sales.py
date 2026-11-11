"""
The final (net) sales register as an .xlsx workbook, for the admin: one row per bill for a period, with what came
back against it as returns and exchanges, so each bill shows what it finally sold for. Bills are grouped by
showroom with a total after each one and an overall total at the end.

A return counts against its bill when it was made by the end of the period, wherever the bill's day falls in it.
The net taxable value and GST are the bill's, in the share of its amount that stayed sold.
"""

from collections import defaultdict
from datetime import date
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.modules.locations import repository as locations
from app.modules.locations.constants import SHOWROOMS
from app.modules.returns.models import SaleReturn
from app.modules.sales.models import Sale
from app.modules.system import settings as app_settings

from .sales_excel import _bounds, _local, _sheet

TITLE = 'Final sales'
HEADER = [
    'Bill no',
    'Date',
    'Showroom',
    'Customer',
    'Mobile',
    'Qty',
    'Taxable',
    'GST',
    'Amount',
    'Returns',
    'Net taxable',
    'Net GST',
    'Net amount',
]
MONEY = ['Taxable', 'GST', 'Amount', 'Returns', 'Net taxable', 'Net GST', 'Net amount']
NO_GST = frozenset({'Taxable', 'GST', 'Net taxable', 'Net GST'})
TOTALLED = range(5, len(HEADER))  # Qty onwards


def _total(label: str, rows: list[list]) -> list:
    return [label, None, None, None, None] + [sum(r[i] for r in rows) for i in TOTALLED]


def build(session: Session, *, location: str | None, since: date | None, until: date | None) -> tuple[bytes, str]:
    """The workbook's bytes and a file name such as final-sales-all-showrooms-2026-11-01-to-2026-11-30.xlsx."""
    gst = app_settings.get(session).show_gst
    city = locations.labels(session)
    start, end = _bounds(since, until)

    stmt = select(Sale).order_by(Sale.at)
    if location:
        stmt = stmt.where(Sale.location_id == location)
    if start:
        stmt = stmt.where(Sale.at >= start)
    if end:
        stmt = stmt.where(Sale.at < end)
    sales = session.scalars(stmt).all()

    returned = defaultdict(float)
    if sales:
        rstmt = select(SaleReturn).where(SaleReturn.sale_id.in_([s.id for s in sales]))
        if end:
            rstmt = rstmt.where(SaleReturn.at < end)
        for r in session.scalars(rstmt).unique().all():
            returned[r.sale_id] += float(r.amount)

    by_shop = defaultdict(list)
    for s in sales:
        t = s.totals
        amount = t['payable']
        back = min(returned[s.id], amount)
        kept = (amount - back) / amount if amount else 0
        by_shop[s.location_id].append(
            [
                s.bill_no,
                _local(s.at),
                city.get(s.location_id, s.location_id),
                s.name,
                s.phone,
                t['qty'],
                t['taxable'],
                t['tax'],
                amount,
                back,
                round(t['taxable'] * kept, 2),
                round(t['tax'] * kept, 2),
                amount - back,
            ]
        )

    rows, totals = [], []
    shops = [s.id for s in SHOWROOMS if not location or s.id == location]
    for shop in shops:
        bills = by_shop.get(shop, [])
        if not bills:
            continue
        total = _total(f'Total · {city.get(shop, shop)}', bills)
        rows += bills + [total]
        totals.append(total)
    if len(shops) > 1:
        rows.append(_total('Total · All showrooms', totals))

    wb = Workbook()
    wb.remove(wb.active)
    _sheet(wb, TITLE, HEADER, rows, MONEY, frozenset() if gst else NO_GST)
    ws = wb[TITLE]
    for row in ws.iter_rows(min_row=2):
        if str(row[0].value or '').startswith('Total · '):
            for cell in row:
                cell.font = Font(bold=True)

    out = BytesIO()
    wb.save(out)
    span = f'{since or "start"}-to-{until or clock.now().astimezone(clock.IST).date()}'
    return out.getvalue(), f'final-sales-{location or "all-showrooms"}-{span}.xlsx'
