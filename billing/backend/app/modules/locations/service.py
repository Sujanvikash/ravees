"""
Stores: the admin adds and removes showrooms here. A store's unique bill prefix doubles as its id and login
(EGM → id "egm", login "egm", default password egm@2026), so two stores in one city each keep their own
numbering. Removing a store that already has history keeps it (active = false, hidden from sign-in); a
brand-new, empty store is deleted outright, login and all.
"""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import Conflict, NotFound
from app.modules.numbering.models import NumberSeries
from app.modules.stock.models import StockLevel
from app.modules.users import service as users

from . import repository
from .constants import WAREHOUSE_ID
from .models import Location


def list_stores(session: Session) -> Sequence[Location]:
    """Every store (not the admin's warehouse), active ones first, then by city and area."""
    stmt = select(Location).where(Location.id != WAREHOUSE_ID).order_by(Location.active.desc(), Location.city, Location.area)
    return session.scalars(stmt).all()


def _has_history(session: Session, location_id: str) -> bool:
    """Whether a store has anything on it: a number issued (a bill, quote, order or return) or any stock."""
    numbered = session.scalar(select(func.count()).select_from(NumberSeries).where(NumberSeries.location_id == location_id))
    stocked = session.scalar(select(func.count()).select_from(StockLevel).where(StockLevel.location_id == location_id))
    return bool(numbered or stocked)


def create_store(session: Session, city: str, area: str, prefix: str) -> Location:
    """Adds a store (and its login). `prefix` is already validated to be 2–8 upper-case letters; it must be new,
    and its lower-case form (the store's id/login) must be free."""
    location_id = prefix.lower()
    if repository.get(session, location_id):
        raise Conflict(f'A store with the id “{location_id}” already exists.')
    if session.scalar(select(Location).where(Location.bill_prefix == prefix)):
        raise Conflict(f'The prefix “{prefix}” is already used by another store.')
    location = Location(id=location_id, city=city, area=area, bill_prefix=prefix, active=True)
    session.add(location)
    session.flush()  # the login's location_id references the store
    users.create_login(session, location_id)
    session.commit()
    session.refresh(location)
    return location


def remove_store(session: Session, location_id: str) -> tuple[bool, Location | None]:
    """Removes a store. With history it is deactivated (kept, hidden from sign-in) and returned; empty, it and
    its login are deleted. Returns (deleted, store): (False, store) when deactivated, (True, None) when deleted."""
    location = repository.get(session, location_id)
    if not location or location.id == WAREHOUSE_ID:
        raise NotFound('No such store.')
    if _has_history(session, location_id):
        location.active = False
        session.commit()
        session.refresh(location)
        return False, location
    users.remove_login(session, location_id)
    session.delete(location)
    session.commit()
    return True, None


def reactivate(session: Session, location_id: str) -> Location:
    """Brings a deactivated store back: it shows on sign-in and in the pickers again."""
    location = repository.get(session, location_id)
    if not location or location.id == WAREHOUSE_ID:
        raise NotFound('No such store.')
    location.active = True
    session.commit()
    session.refresh(location)
    return location
