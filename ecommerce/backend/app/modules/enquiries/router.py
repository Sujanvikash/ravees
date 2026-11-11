import uuid
from functools import lru_cache

from fastapi import APIRouter, Request, Response
from sqlalchemy import select

from app.core import clock
from app.core.dependencies import DbSession
from app.core.errors import InvalidInput, NotFound, TooManyRequests
from app.core.throttling import LoginThrottle
from app.modules.accounts.dependencies import CurrentAdmin, OptionalCustomer, client_address

from .models import Enquiry
from .schemas import EnquiryIn, EnquiryOut, EnquiryStatusIn

router = APIRouter(prefix='/enquiries', tags=['enquiries'])
admin_router = APIRouter(prefix='/admin/enquiries', tags=['admin'])

# a brake on a script filling the inbox: at most this many enquiries from one address in 10 minutes
PER_ADDRESS = 10


@lru_cache
def get_enquiry_throttle() -> LoginThrottle:
    return LoginThrottle(PER_ADDRESS, 10 * 60)


def _get(session: DbSession, enquiry_id: uuid.UUID) -> Enquiry:
    enquiry = session.get(Enquiry, enquiry_id)
    if not enquiry:
        raise NotFound('No such enquiry.')
    return enquiry


@router.post('', status_code=201)
def create(body: EnquiryIn, request: Request, customer: OptionalCustomer, session: DbSession) -> EnquiryOut:
    """An enquiry from the website. A signed-in customer's is linked to the account, and their email and phone fill
    in what the form left out."""
    if not (body.email or body.phone or customer):
        raise InvalidInput('Leave an email or a phone number so we can get back to you.')
    throttle, address = get_enquiry_throttle(), client_address(request)
    wait = throttle.retry_after(address)
    if wait:
        raise TooManyRequests(
            'We’ve had a lot of messages from you just now. Please try again in a few minutes.', retry_after=wait
        )
    throttle.record_failure(address)
    enquiry = Enquiry(
        **body.model_dump(by_alias=False),
        customer_id=customer.id if customer else None,
        status='new',
        created_at=clock.now(),
    )
    if customer:
        enquiry.email = enquiry.email or customer.email
        enquiry.phone = enquiry.phone or customer.phone
    session.add(enquiry)
    session.commit()
    return EnquiryOut.model_validate(enquiry, from_attributes=True)


@admin_router.get('')
def list_enquiries(_: CurrentAdmin, session: DbSession) -> list[EnquiryOut]:
    rows = session.scalars(select(Enquiry).order_by(Enquiry.created_at.desc()))
    return [EnquiryOut.model_validate(e, from_attributes=True) for e in rows]


@admin_router.patch('/{enquiry_id}')
def set_status(enquiry_id: uuid.UUID, body: EnquiryStatusIn, _: CurrentAdmin, session: DbSession) -> EnquiryOut:
    enquiry = _get(session, enquiry_id)
    enquiry.status = body.status
    session.commit()
    return EnquiryOut.model_validate(enquiry, from_attributes=True)


@admin_router.delete('/{enquiry_id}', status_code=204)
def delete(enquiry_id: uuid.UUID, _: CurrentAdmin, session: DbSession) -> Response:
    session.delete(_get(session, enquiry_id))
    session.commit()
    return Response(status_code=204)
