from collections.abc import Mapping, Sequence

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from .models import StockImport, StockLevel


def adjust(session: Session, location_id: str, deltas: Mapping[str, int]) -> None:
    """Adds each delta (negative to take off) to the showroom's stock of that product, in one statement."""
    rows = [{'location_id': location_id, 'code': code, 'qty': qty} for code, qty in deltas.items() if qty]
    if not rows:
        return
    stmt = insert(StockLevel).values(rows)
    session.execute(
        stmt.on_conflict_do_update(
            index_elements=[StockLevel.location_id, StockLevel.code], set_={'qty': StockLevel.qty + stmt.excluded.qty}
        )
    )


def levels(session: Session, location_id: str | None = None) -> Sequence[StockLevel]:
    stmt = select(StockLevel)
    if location_id:
        stmt = stmt.where(StockLevel.location_id == location_id)
    return session.scalars(stmt).all()


def get_import(session: Session, import_id) -> StockImport | None:
    return session.get(StockImport, import_id)


def list_imports(session: Session, location_id: str | None = None) -> Sequence[StockImport]:
    stmt = select(StockImport).order_by(StockImport.at)
    if location_id:
        stmt = stmt.where(StockImport.location_id == location_id)
    return session.scalars(stmt).all()
