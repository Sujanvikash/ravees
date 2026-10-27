import uuid
from datetime import datetime

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser
from app.modules.sales.schemas import SaleOut

from . import service
from .schemas import ReturnableOut, ReturnIn, ReturnOut, ReturnResult

router = APIRouter(prefix='/returns', tags=['returns'])


@router.get('')
def list_returns(
    user: CurrentUser, session: DbSession, location: str | None = None, since: datetime | None = None
) -> list[ReturnOut]:
    """Credit notes (returns and exchanges), oldest first: a showroom's own, or for the admin every showroom's."""
    return [ReturnOut.from_model(r) for r in service.list_returns(session, user, location, since)]


@router.get('/bill')
def find_bill(
    user: CurrentUser, session: DbSession, bill_no: str | None = None, sale_id: uuid.UUID | None = None
) -> ReturnableOut:
    """A bill to take a return against (by number or id): each line with how much can still come back."""
    sale, lines, until, is_open = service.returnable(session, user, sale_id, bill_no)
    return ReturnableOut(sale=SaleOut.from_model(sale), lines=lines, returnable_until=until, open=is_open)


@router.post('', status_code=status.HTTP_201_CREATED)
def create_return(body: ReturnIn, user: CurrentUser, session: DbSession) -> ReturnResult:
    """A return (refunded in cash) or an exchange (with the new bill) against a bill of this showroom."""
    record, sale = service.create_return(session, user, body)
    return ReturnResult(credit_note=ReturnOut.from_model(record), sale=SaleOut.from_model(sale) if sale else None)
