from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, InvalidInput
from app.modules.auth.access import acting_location, by_label, visible_location
from app.modules.products import repository as products
from app.modules.users.models import User

from . import repository
from .models import StockImport
from .schemas import StockImportIn


def stock_by_location(session: Session, user: User, location: str | None = None) -> dict[str, dict[str, int]]:
    """{location: {code: qty}} for the showrooms this login may see."""
    out: dict[str, dict[str, int]] = {}
    for level in repository.levels(session, visible_location(user, location)):
        out.setdefault(level.location_id, {})[level.code] = level.qty
    return out


def list_imports(session: Session, user: User, location: str | None = None) -> Sequence[StockImport]:
    return repository.list_imports(session, visible_location(user, location))


def merge_lines(lines, catalogue) -> list[dict]:
    """[{code, qty, rate?}] → [{code, name, qty, rate}] with names from the catalogue and the same code added
    together. Raises InvalidInput naming any code not in the catalogue."""
    unknown = sorted({line.code.strip().upper() for line in lines} - set(catalogue))
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    merged: dict[str, dict] = {}
    for line in lines:
        product = catalogue[line.code.strip().upper()]
        rate = line.rate if line.rate is not None else float(product.cost)
        row = merged.setdefault(product.code, {'code': product.code, 'name': product.name, 'qty': 0, 'rate': rate})
        row['qty'] += line.qty
    return list(merged.values())


def import_stock(session: Session, user: User, data: StockImportIn, *, at: datetime | None = None) -> StockImport:
    """Keeps the import as a record and adds its quantities to the showroom's stock, in one transaction. The same
    id sent again returns the first import without adding anything."""
    existing = repository.get_import(session, data.id)
    if existing:
        if existing.location_id != (data.location if user.is_admin else user.location_id):
            raise Conflict('That import id is already used.')
        return existing
    location = acting_location(session, user, data.location)
    lines = merge_lines(data.lines, products.by_codes(session, (line.code for line in data.lines)))
    record = StockImport(
        id=data.id,
        at=at or clock.now(),
        location_id=location.id,
        by=by_label(user, location),
        username=user.username,
        file=data.file,
        source=data.source,
        lines=lines,
    )
    session.add(record)
    repository.adjust(session, location.id, {line['code']: line['qty'] for line in lines})
    session.commit()
    return record
