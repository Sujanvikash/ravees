import uuid

from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool

from app.core.dependencies import DbSession
from app.modules.accounts.dependencies import CurrentAdmin, CurrentCustomer

from . import service
from .schemas import CheckoutOut, OrderIn, OrderOut, StatusIn, VerifyIn

router = APIRouter(prefix='/orders', tags=['orders'])
payments_router = APIRouter(prefix='/payments', tags=['payments'])
admin_router = APIRouter(prefix='/admin/orders', tags=['admin'])


@router.post('', status_code=201)
def checkout(body: OrderIn, customer: CurrentCustomer, session: DbSession) -> CheckoutOut:
    return CheckoutOut.model_validate(service.checkout(session, customer, body))


@router.get('')
def my_orders(customer: CurrentCustomer, session: DbSession) -> list[OrderOut]:
    return [OrderOut.model_validate(o) for o in service.list_orders(session, customer)]


@router.get('/{order_id}')
def my_order(order_id: uuid.UUID, customer: CurrentCustomer, session: DbSession) -> OrderOut:
    return OrderOut.model_validate(service.get_order(session, customer, order_id))


@router.post('/{order_id}/verify')
def verify(order_id: uuid.UUID, body: VerifyIn, customer: CurrentCustomer, session: DbSession) -> OrderOut:
    return OrderOut.model_validate(
        service.verify(
            session, customer, order_id, body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature
        )
    )


@payments_router.post('/razorpay/webhook')
async def razorpay_webhook(request: Request, session: DbSession) -> dict:
    """Set in Razorpay's dashboard (Webhooks) for payment.captured and order.paid, with RAZORPAY_WEBHOOK_SECRET."""
    body = await request.body()  # the raw bytes: the signature is over them exactly
    await run_in_threadpool(service.webhook, session, body, request.headers.get('X-Razorpay-Signature', ''))
    return {'ok': True}


@admin_router.get('')
def all_orders(_: CurrentAdmin, session: DbSession) -> list[OrderOut]:
    return [OrderOut.model_validate(o) for o in service.list_orders(session)]


@admin_router.patch('/{order_id}')
def set_status(order_id: uuid.UUID, body: StatusIn, _: CurrentAdmin, session: DbSession) -> OrderOut:
    return OrderOut.model_validate(service.set_status(session, order_id, body.status, body.note))
