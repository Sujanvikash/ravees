from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .constants import SHOWROOMS
from .models import Location


def get(session: Session, location_id: str) -> Location | None:
    return session.get(Location, location_id)


def add_missing_showrooms(session: Session) -> int:
    """Adds any of the five showrooms not in the table yet. Existing rows are left alone. Returns how many
    were added."""
    existing = set(session.scalars(select(Location.id)))
    missing = [s for s in SHOWROOMS if s.id not in existing]
    session.add_all(Location(id=s.id, city=s.city, area=s.area, bill_prefix=s.bill_prefix) for s in missing)
    session.flush()
    return len(missing)


def take_next_product_no(session: Session, location_id: str) -> tuple[str, int]:
    """The showroom's bill prefix and its next product number, which is used up. One UPDATE ... RETURNING, so
    the row stays locked until the caller commits and two counters can never be given the same number."""
    prefix, number = session.execute(
        update(Location)
        .where(Location.id == location_id)
        .values(next_product_no=Location.next_product_no + 1)
        .returning(Location.bill_prefix, Location.next_product_no - 1)
    ).one()
    return prefix, number
