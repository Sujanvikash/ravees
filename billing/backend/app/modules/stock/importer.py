"""
A stock sheet in the purchase Excel format (Code, Qty, Purchase rate), imported into the admin's own stock the way
Inventory -> Import stock does it. The season's sheet (seed/admin-stock-2026.xlsx, made by seed/stock_from_list.py from
the season's list) is imported by `python -m app.cli seed --admin-stock` on the server and by the demo.
"""

import hashlib
import uuid
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR
from app.modules.locations.constants import ADMIN_USERNAME, WAREHOUSE_ID
from app.modules.users import repository as users

from . import repository
from . import service as stock_service
from .schemas import ImportLineIn, StockImportIn

ADMIN_STOCK = BACKEND_DIR / 'seed' / 'admin-stock-2026.xlsx'


def read_sheet(path: Path) -> list[ImportLineIn]:
    """The rows of a stock sheet: its Code, Qty and Purchase rate columns."""
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        rows = list(workbook.active.iter_rows(values_only=True))
    finally:
        workbook.close()
    header = [str(h or '').strip().lower() for h in rows[0]]
    code, qty, rate = header.index('code'), header.index('qty'), header.index('purchase rate')
    return [
        ImportLineIn(code=str(r[code]).strip().upper(), qty=int(r[qty]), rate=r[rate] or None)
        for r in rows[1:]
        if r[code] and r[qty]
    ]


def import_admin_stock(session: Session, path: Path = ADMIN_STOCK) -> tuple[int, bool]:
    """Adds the sheet to the admin's own stock, once: the import's id is made from the file's contents, so the same
    file imported again adds nothing. Returns the units in the sheet and whether they were added now. Commits."""
    data = path.read_bytes()
    import_id = uuid.uuid5(uuid.NAMESPACE_URL, f'raaves-billing/admin-stock/{hashlib.sha256(data).hexdigest()}')
    lines = read_sheet(path)
    units = sum(line.qty for line in lines)
    if repository.get_import(session, import_id):
        return units, False
    admin = users.get(session, ADMIN_USERNAME)
    stock_service.import_stock(
        session, admin, StockImportIn(id=import_id, location=WAREHOUSE_ID, file=path.name, lines=lines)
    )
    return units, True
