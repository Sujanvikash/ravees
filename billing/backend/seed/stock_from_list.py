"""
Turn a season's product list (an export from the old billing software with a total quantity column, "TCT QTY") into
a stock sheet in the purchase Excel format: Code, Product name, Qty, Purchase rate (the cost price).

    python stock_from_list.py products-2026.xls admin-stock-2026.xlsx

Needs: pip install xlrd openpyxl. The sheet is what the admin holds of the season's products: the demo imports it
into the admin stock, and on the live server the admin imports it under Inventory -> Import stock (Admin stock).
"""
import re
import sys
import unicodedata
from pathlib import Path

import xlrd
from openpyxl import Workbook
from openpyxl.styles import Font

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
QTY = 'TCT QTY'

sh = xlrd.open_workbook(SRC).sheet_by_index(0)
H = [str(h).strip() for h in sh.row_values(2)]
col = {h: i for i, h in enumerate(H) if h}
if QTY not in col:
    sys.exit(f'{SRC.name} has no "{QTY}" column.')


def txt(v):
    if v == '' or v is None:
        return ''
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else str(v)
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(v))).strip()


wb = Workbook()
ws = wb.active
ws.title = 'Admin stock'
ws.append(['Code', 'Product name', 'Qty', 'Purchase rate'])
for c in ws[1]:
    c.font = Font(bold=True)
rows = skipped = units = 0
for r in range(3, sh.nrows):
    code = txt(sh.cell_value(r, col['Code'])).upper()
    qty = sh.cell_value(r, col[QTY])
    if not code:
        continue
    if not isinstance(qty, float) or qty <= 0 or not qty.is_integer():
        skipped += 1
        print(f'  row {r + 1} {code}: no whole quantity ({qty!r}), left out')
        continue
    ws.append([code, txt(sh.cell_value(r, col['Product Name'])), int(qty), round(float(sh.cell_value(r, col['D.Rate']) or 0), 2)])
    ws.cell(ws.max_row, 1).number_format = '@'
    rows += 1
    units += int(qty)
for L, w in zip('ABCD', (12, 48, 8, 14)):
    ws.column_dimensions[L].width = w
wb.save(OUT)
print(f'products={rows} units={units} skipped={skipped}')
