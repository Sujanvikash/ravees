"""
Add a season's new product list (an export from the old billing software) to the cleaned catalogue, and make
those products the season: they get Y in "In Season 2026", every other product loses it.

    python add_products.py products-2026.xls products-clean.xlsx

Needs: pip install xlrd openpyxl. Cleans the rows the same way as clean_products.py, but prices them the way the
list means: a customer pays the retail price (Ret.Rate) less the discount column (DiscP), so the Offer Price is
worked out from those (S.Price isn't used); a discount below 0 is dropped. It also puts back the last 0 of a 7-digit
HSN. Refuses a list whose codes are already in the catalogue, so running it twice does nothing. What was changed or
still needs checking goes in a "Review <file>" sheet.
"""
import sys, re, unicodedata
from collections import Counter
from copy import copy
from pathlib import Path
import xlrd
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
YEAR = 2026
SEASON = f'In Season {YEAR}'

sh = xlrd.open_workbook(SRC).sheet_by_index(0)
H = [h.strip() for h in sh.row_values(2)]
col = {h: i for i, h in enumerate(H) if h}


def txt(v):
    """Cell value as clean text: 9505100.0 -> '9505100', full-width signs made plain, whitespace collapsed."""
    if v == '' or v is None:
        return ''
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else str(v)
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(v))).strip()


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


wb = load_workbook(OUT)
ws = wb['Products']
head = [c.value for c in ws[1]]
at = {h: i for i, h in enumerate(head)}
have = {str(ws.cell(r, 1).value).strip().upper() for r in range(2, ws.max_row + 1) if ws.cell(r, 1).value}

new, review = [], []
for r in range(3, sh.nrows):
    def g(h):
        return sh.cell_value(r, col[h])

    code, name = txt(g('Code')).upper(), txt(g('Product Name'))
    if not code:
        continue
    if code in have:
        sys.exit(f'{code} (row {r + 1}) is already in {OUT.name}: nothing added.')
    issues = []
    # a customer pays the retail price (MRP) less the discount column; the cost (D.Rate) is what a showroom is invoiced
    mrp, cost, disc = num(g('Ret.Rate')), round(num(g('D.Rate')), 2), num(g('DiscP'))  # the discount unrounded: 9.589041...
    if mrp == 0:
        issues.append('MRP is 0')
    if cost == 0:
        issues.append('Cost (D.Rate) is 0')
    if disc < 0 or disc >= 100:
        issues.append(f'Discount {disc:.2f}% would sell it at {mrp * (1 - disc / 100):.2f}: no discount, sells at the MRP {mrp:g}')
        disc = 0
    elif disc > 50:
        issues.append(f'Discount {disc:.2f}% looks too large: sells at {mrp * (1 - disc / 100):.2f}')
    offer = round(mrp * (1 - disc / 100), 2) if disc and mrp else 0.0
    listed = num(g('S.Price'))
    if offer and listed and abs(offer - listed) >= 0.5:
        issues.append(f'Sells at {offer:g} (MRP less {disc:.2f}%), not the S.Price {listed:g}')
    disc = round(disc, 2) or None
    barcode = txt(g('Supl Code'))
    if isinstance(g('Supl Code'), float) and len(barcode) >= 12 and re.search(r'0{5,}$', barcode):
        issues.append(f'Barcode damaged by Excel ({barcode}), re-scan needed')
        barcode = ''
    hsn = txt(g('HSN'))
    if len(hsn) == 7:  # 9505100: an 8-digit code typed as a number lost its last 0
        issues.append(f'HSN corrected ({hsn} -> {hsn}0)')
        hsn += '0'
    if not hsn:
        issues.append('HSN is blank')
    elif len(hsn) not in (4, 6, 8):
        issues.append(f'HSN {hsn} has {len(hsn)} digits (should be 4, 6 or 8)')
    gst = num(g('S.Tax%'))
    upper = name.upper()
    kind = 'Service' if ('COURIER' in upper or 'TRANSPORT' in upper) else 'Product'
    if gst == 0 and kind == 'Product':
        issues.append('GST is 0%')
    row = {
        'Code': code, 'Name': name, 'Type': kind,
        'Department': txt(g('Department')), 'Dept No': int(num(g('Dept'))),
        'Sub Code': txt(g('SCode')).upper(),
        'Supplier Item No': txt(g('Product No.')), 'Barcode': barcode, 'HSN': hsn,
        'MRP': mrp, 'Offer Price': offer or None, 'Discount %': disc, 'Cost Price': cost,
        'GST % (Sale)': gst, 'Tax % (Purchase)': num(g('P.Tax%')),
        'Manufacturer': txt(g('Mfr.Name')), 'Origin': txt(g('Mfr.Add.')),
        'Added Year': YEAR, 'Added Month': None,
        SEASON: 'Y',
        'Source Row': r + 1, 'Source File': SRC.name,
    }
    new.append(row)
    if issues:
        review.append([r + 1, code, name, '; '.join(issues)])

names = Counter(p['Name'].upper() for p in new)
for p in new:
    if names[p['Name'].upper()] > 1:
        hit = next((rv for rv in review if rv[1] == p['Code']), None)
        what = f'Name used by {names[p["Name"].upper()]} codes in this list'
        if hit:
            hit[3] += '; ' + what
        else:
            review.append([p['Source Row'], p['Code'], p['Name'], what])
review.sort()

# ---------- write ----------
if 'Source File' not in at:  # older rows all came from the first export
    c = ws.cell(1, len(head) + 1, 'Source File')
    c.font, c.fill = copy(ws.cell(1, 1).font), copy(ws.cell(1, 1).fill)
    for rr in range(2, ws.max_row + 1):
        ws.cell(rr, len(head) + 1, 'products.xlsx')
    head.append('Source File')
    at['Source File'] = len(head) - 1
    ws.column_dimensions[get_column_letter(len(head))].width = 18
for rr in range(2, ws.max_row + 1):
    ws.cell(rr, at[SEASON] + 1).value = None
style = [ws.cell(2, i + 1) for i in range(len(head))]
for p in new:
    ws.append([p.get(h) for h in head])
    for i, s in enumerate(style):
        c = ws.cell(ws.max_row, i + 1)
        c.number_format, c.fill = s.number_format, copy(s.fill)
ws.auto_filter.ref = ws.dimensions

title = f'Review {SRC.stem}'[:31]
if title in wb.sheetnames:
    del wb[title]
rv = wb.create_sheet(title, wb.sheetnames.index('Needs Review') + 1)
rv.append([f'Row in {SRC.name}', 'Code', 'Name', 'What to check'])
for c in rv[1]:
    c.font, c.fill = Font(bold=True, color='FFFFFF'), PatternFill('solid', fgColor='1F4E3D')
for x in review:
    rv.append(x)
rv.freeze_panes = 'A2'
rv.auto_filter.ref = rv.dimensions
for L, w in zip('ABCD', (16, 10, 48, 80)):
    rv.column_dimensions[L].width = w

notes = wb['Notes']
notes.append(('', '', ''))
notes.append((SRC.name, f'Season {YEAR} list',
              f'{len(new)} new products added (Source File = {SRC.name}, Source Row = its row), and made the season: '
              f'only they have Y in "{SEASON}". {len(review)} flagged in "{title}".'))
wb.save(OUT)

print(f'added={len(new)} review={len(review)} catalogue={len(have) + len(new)}')
cnt = Counter()
for x in review:
    for i in x[3].split('; '):
        cnt[re.sub(r'-?\d[\d.]*', '#', re.sub(r'\(.*', '', i)).strip()] += 1
for k, v in cnt.most_common():
    print(f'  {v:5}  {k}')
