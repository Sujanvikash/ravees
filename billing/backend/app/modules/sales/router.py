import uuid
from datetime import datetime

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import CollectionIn, CustomerLookupIn, CustomerOut, SaleIn, SaleOut

router = APIRouter(prefix='/sales', tags=['sales'])


@router.get('')
def list_sales(
    user: CurrentUser, session: DbSession, location: str | None = None, since: datetime | None = None
) -> list[SaleOut]:
    """Bills, oldest first: a showroom's own, or for the admin every showroom's (or one). With `since`, only
    those saved at or after it."""
    return [SaleOut.from_model(s) for s in service.list_sales(session, user, location, since)]


@router.post('/customer')
def find_customer(body: CustomerLookupIn, user: CurrentUser, session: DbSession) -> CustomerOut | None:
    """A returning customer by their exact mobile number, from bills at every showroom: the name on their latest
    bill, how many bills and when the last was. null for a number never billed, so the counter can fill in the
    name. A POST, so mobile numbers stay out of URLs and access logs."""
    return service.find_customer(session, body.phone)


@router.post('', status_code=status.HTTP_201_CREATED)
def create_sale(body: SaleIn, user: CurrentUser, session: DbSession) -> SaleOut:
    """A bill from a showroom counter. The server prices it, gives it the next bill number and takes the items
    off the showroom's stock. Sending the same `id` again returns the saved bill instead of billing twice."""
    return SaleOut.from_model(service.create_sale(session, user, body))


@router.post(
    '/{sale_id}/collections',
    status_code=status.HTTP_201_CREATED,
    responses={404: {'description': 'Not a bill of this showroom'}, 409: {'description': 'Already paid in full'}},
)
def collect_balance(sale_id: uuid.UUID, body: CollectionIn, user: CurrentUser, session: DbSession) -> SaleOut:
    """A payment towards a credit bill's balance, at the showroom that made the bill. Returns the bill with the
    new balance and the payment (its receipt number) at the end of `collections`. Sending the same `id` again
    returns the bill without collecting twice."""
    return SaleOut.from_model(service.collect(session, user, sale_id, body))
