"""
Put the new price list of 15 box products ("CHNAGES TO SINGLE PICS.pdf", 15 Nov 2026) into the seed files, the way
migration 0017 puts it into a live database (the list is read from it, so the two can't differ):

    python box_prices_to_pieces.py products-clean.xlsx admin-stock-2026.xlsx

Needs: pip install openpyxl alembic sqlalchemy. In the product Excel each keeps its code and gets the list's MRP,
selling price (Offer Price, with its Discount %) and D.Rate (Cost Price); in the stock sheet its Qty is multiplied by
the old selling price over the new one, to the nearest whole piece, and its Purchase rate is the D.Rate. Refuses
files that already have the new prices, so running it twice does nothing.
"""

import importlib.util
import sys
from decimal import Decimal
from pathlib import Path

from openpyxl import load_workbook

PRODUCTS, STOCK = Path(sys.argv[1]), Path(sys.argv[2])
MIGRATION = Path(__file__).resolve().parent.parent / 'migrations' / 'versions' / '0017_box_prices_to_pieces.py'

spec = importlib.util.spec_from_file_location('box_prices_migration', MIGRATION)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
LIST = {code: rest for code, *rest in migration.PIECES}


def columns(ws):
    return {c.value: c.column for c in ws[1]}


wb = load_workbook(PRODUCTS)
ws = wb['Products']
at = columns(ws)
rows = {str(ws.cell(r, at['Code']).value).strip().upper(): r for r in range(2, ws.max_row + 1)}
for code, (was, mrp, offer, cost) in LIST.items():
    r = rows[code]
    selling = ws.cell(r, at['Offer Price']).value or ws.cell(r, at['MRP']).value
    if selling != was:
        sys.exit(f'{code} sells at {selling} in {PRODUCTS.name}, not {was}: nothing changed.')
    ws.cell(r, at['MRP']).value = mrp
    ws.cell(r, at['Offer Price']).value = offer
    ws.cell(r, at['Discount %']).value = float(round(Decimal(100) - Decimal(100 * offer) / mrp, 2))
    ws.cell(r, at['Cost Price']).value = cost
notes = wb['Notes']
notes.append(('', '', ''))
notes.append(
    (
        'CHNAGES TO SINGLE PICS.pdf',
        'Season 2026: 15 box products sold by the piece',
        f"{', '.join(LIST)} keep their codes with the list's MRP, selling price and D.Rate (Cost Price).",
    )
)

stock = load_workbook(STOCK)
sh = stock.active
col = {str(c.value).strip().lower(): c.column for c in sh[1]}
units = 0
for r in range(2, sh.max_row + 1):
    code = str(sh.cell(r, col['code']).value or '').strip().upper()
    if code in LIST:
        was, _, offer, cost = LIST[code]
        qty = sh.cell(r, col['qty']).value
        sh.cell(r, col['qty']).value = migration.pieces(qty, was, offer)
        sh.cell(r, col['purchase rate']).value = cost
    units += sh.cell(r, col['qty']).value or 0

wb.save(PRODUCTS)
stock.save(STOCK)
print(f'prices={len(LIST)} stock units={units}')
