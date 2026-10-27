"""
Which showroom a login works on. A showroom login only ever sees and changes its own showroom; the admin sees
every showroom (or one, when it asks for one) and names the showroom when it acts for one.
"""

from sqlalchemy.orm import Session

from app.core.errors import InvalidInput
from app.modules.locations import repository as locations
from app.modules.locations.models import Location
from app.modules.users.models import User


def visible_location(user: User, location: str | None = None) -> str | None:
    """The showroom whose records this login may read: its own, or for the admin the one asked for (None: all)."""
    if user.is_admin:
        return location or None
    return user.location_id


def acting_location(session: Session, user: User, location: str | None = None) -> Location:
    """The showroom this login is acting for: its own, or the one the admin names (InvalidInput if none)."""
    location_id = location if user.is_admin else user.location_id
    found = locations.get(session, location_id) if location_id else None
    if not found:
        raise InvalidInput('Choose the showroom.')
    return found


def by_label(user: User, location: Location | None = None) -> str:
    """Who did it, as order history and stock records show it: "Admin" or the showroom's city."""
    if user.is_admin:
        return 'Admin'
    return location.city if location else (user.location_id or user.username)
