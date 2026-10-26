from collections.abc import Sequence
from itertools import batched

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from .importer import ProductRow
from .models import Product

# rows per INSERT, well under PostgreSQL's 65,535 parameters per statement
_UPSERT_BATCH = 1000


def get(session: Session, code: str) -> Product | None:
    return session.get(Product, code)


def exists(session: Session, code: str) -> bool:
    return session.scalar(select(select(Product.code).where(Product.code == code).exists())) is True


def list_all(session: Session) -> Sequence[Product]:
    """Every product, by department and name."""
    return session.scalars(select(Product).order_by(Product.dept, Product.name, Product.code)).all()


def add(session: Session, product: Product) -> Product:
    session.add(product)
    session.flush()
    return product


def upsert_many(session: Session, rows: Sequence[ProductRow], *, keep_in_season: bool) -> None:
    """Inserts new products and updates the details of existing ones, in one statement per batch. With
    keep_in_season, an existing product keeps its in_season (the admin's choice)."""
    keep = {'code'} | ({'in_season'} if keep_in_season else set())
    for batch in batched(rows, _UPSERT_BATCH):
        stmt = insert(Product).values(list(batch))
        columns = {c: stmt.excluded[c] for c in batch[0] if c not in keep}
        session.execute(
            stmt.on_conflict_do_update(index_elements=[Product.code], set_={**columns, 'updated_at': func.now()})
        )


def count(session: Session, *, in_season_only: bool = False) -> int:
    stmt = select(func.count()).select_from(Product)
    if in_season_only:
        stmt = stmt.where(Product.in_season)
    return session.scalar(stmt) or 0
