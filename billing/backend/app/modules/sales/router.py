import uuid
from datetime import datetime

from fastapi import APIRouter, Request, status

from app.core.dependencies import DbSession
from app.modules.auth import service as auth
from app.modules.auth.dependencies import CurrentUser, Throttle

from . import service
from .schemas import (
    BillPasswordIn,
    CollectionIn,
    CustomerLookupIn,
    CustomerOut,
    DeletedSaleOut,
    OfflineCounterOut,
    SaleEditIn,
    SaleIn,
    SaleOut,
)

router = APIRouter(prefix='/sales', tags=['sales'])


def _client(request: Request) -> str:
    return request.client.host if request.client else 'unknown'


@router.get('')
def list_sales(
    user: CurrentUser, session: DbSession, location: str | None = None, since: datetime | None = None
) -> list[SaleOut]:
    """Bills, oldest first: a showroom's own, or for the admin every showroom's (or one). With `since`, only
    those saved at or after it."""
    return [SaleOut.from_model(s) for s in service.list_sales(session, user, location, since)]


@router.get('/deleted')
def list_deleted(user: CurrentUser, session: DbSession, location: str | None = None) -> list[DeletedSaleOut]:
    """Bills deleted after they were made, the latest deleted first: a showroom's own, or for the admin every
    showroom's (or one). They count in no figure; this is what they were, and who deleted them when."""
    return [DeletedSaleOut.from_model(d) for d in service.list_deleted(session, user, location)]


@router.post('/customer')
def find_customer(body: CustomerLookupIn, user: CurrentUser, session: DbSession) -> CustomerOut | None:
    """A returning customer by their exact mobile number, from bills at every showroom: the name on their latest
    bill, how many bills and when the last was. null for a number never billed, so the counter can fill in the
    name. A POST, so mobile numbers stay out of URLs and access logs."""
    return service.find_customer(session, body.phone)


@router.post('', status_code=status.HTTP_201_CREATED)
def create_sale(body: SaleIn, user: CurrentUser, session: DbSession) -> SaleOut:
    """A bill from a showroom counter. The server prices it, gives it the next bill number and takes the items
    off the showroom's stock. Sending the same `id` again returns the saved bill instead of billing twice. A bill
    made offline (`offline`) keeps the number and time it was printed with."""
    return SaleOut.from_model(service.create_sale(session, user, body))


@router.post('/offline-counter', status_code=status.HTTP_201_CREATED)
def offline_counter(user: CurrentUser, session: DbSession) -> OfflineCounterOut:
    """A new counter number for this browser at its showroom, asked for once while online, so the bills it makes
    while the internet is down get numbers of their own (CHN2627OF020001…) that no other counter uses."""
    return OfflineCounterOut(counter=service.offline_counter(session, user))


@router.post(
    '/edit-password',
    status_code=status.HTTP_204_NO_CONTENT,
    responses={403: {'description': 'Wrong password'}, 429: {'description': 'Too many wrong passwords'}},
)
def check_edit_password(
    body: BillPasswordIn, request: Request, user: CurrentUser, session: DbSession, throttle: Throttle
) -> None:
    """Checks the password for editing a bill, before the counter opens a bill to edit. A wrong one is a 403, so
    the counter stays signed in."""
    auth.check_edit_bill_password(session, throttle, body.password, _client(request))


@router.post(
    '/delete-password',
    status_code=status.HTTP_204_NO_CONTENT,
    responses={403: {'description': 'Wrong password'}, 429: {'description': 'Too many wrong passwords'}},
)
def check_delete_password(
    body: BillPasswordIn, request: Request, user: CurrentUser, session: DbSession, throttle: Throttle
) -> None:
    """Checks the password for deleting a bill, before Sales asks to confirm the delete. A wrong one is a 403, so
    the counter stays signed in."""
    auth.check_delete_bill_password(session, throttle, body.password, _client(request))


@router.put(
    '/{sale_id}',
    responses={
        403: {'description': 'Wrong password, or not a showroom login'},
        404: {'description': 'Not a bill of this showroom'},
        409: {'description': 'Returned, exchanged or part-collected: it takes a return instead'},
    },
)
def edit_sale(
    sale_id: uuid.UUID, body: SaleEditIn, request: Request, user: CurrentUser, session: DbSession, throttle: Throttle
) -> SaleOut:
    """Edits one of this showroom's bills after it was made, with the password for editing: its lines, discounts,
    customer and payment are replaced, and it keeps its bill number and date. Stock is put right and what the
    bill was is kept in `edits`."""
    auth.check_edit_bill_password(session, throttle, body.password, _client(request))
    return SaleOut.from_model(service.edit_sale(session, user, sale_id, body))


@router.post(
    '/{sale_id}/delete',
    responses={
        403: {'description': 'Wrong password, or not a showroom login'},
        404: {'description': 'Not a bill of this showroom'},
        409: {'description': 'Returned, exchanged or part-collected: it takes a return instead'},
    },
)
def delete_sale(
    sale_id: uuid.UUID,
    body: BillPasswordIn,
    request: Request,
    user: CurrentUser,
    session: DbSession,
    throttle: Throttle,
) -> DeletedSaleOut:
    """Deletes one of this showroom's bills after it was made, with the password for deleting: its items go back
    into stock and it counts in no figure, its number isn't used again, and what it was is kept (GET
    /sales/deleted)."""
    auth.check_delete_bill_password(session, throttle, body.password, _client(request))
    return DeletedSaleOut.from_model(service.delete_sale(session, user, sale_id))


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
