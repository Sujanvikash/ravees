from datetime import date

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import CloseIn, CloseOut, DayOut

router = APIRouter(prefix='/cash', tags=['cash'])


@router.get('/day')
def get_day(user: CurrentUser, session: DbSession, location: str | None = None, day: date | None = None) -> DayOut:
    """One showroom's cash for a day (today if left out): the float, cash from bills, refunds, and what should be
    in the drawer. The admin names the showroom."""
    return service.get_day(session, user, location, day)


@router.get('/closes')
def list_closes(
    user: CurrentUser, session: DbSession, location: str | None = None, since: date | None = None
) -> list[CloseOut]:
    """Closed days, newest first, with each difference: a showroom's own, or for the admin every showroom's."""
    return [CloseOut.from_model(c) for c in service.list_closes(session, user, location, since)]


@router.post('/closes', status_code=status.HTTP_201_CREATED, responses={409: {'description': 'Already closed'}})
def close_day(body: CloseIn, user: CurrentUser, session: DbSession) -> CloseOut:
    """A showroom closes its day with the cash it counted."""
    return CloseOut.from_model(service.close_day(session, user, body))
