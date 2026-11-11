"""
Orders: checking out (priced from the catalogue, never from what the browser says), paying through Razorpay,
and the admin moving an order along until it is delivered.

Paying: POST /orders makes the order (pending) and its Razorpay order; the website opens Razorpay Checkout; the
payment is confirmed by its signature, from the browser (verify) or from Razorpay's webhook, whichever comes first.
"""

import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core import clock
from app.core.config import Settings, get_settings
from app.core.errors import Conflict, InvalidInput, NotFound, ServiceUnavailable
from app.modules.accounts.models import Customer
from app.modules.catalogue.models import Category, Product
from app.modules.catalogue.service import image_url
from app.modules.mail import service as mail
from app.modules.site import service as site

from . import razorpay
from .models import NumberSeries, Order
from .schemas import OrderIn

log = logging.getLogger('shop.orders')

SHOP_NAME = "Raave's Evergreen"

# where an order may go next; the same status again only adds a note (a courier's tracking number, say)
NEXT = {
    'pending': {'paid', 'cancelled'},
    'paid': {'shipped', 'cancelled'},
    'shipped': {'delivered'},
    'delivered': set(),
    'cancelled': set(),
}


def _next_number(session: Session, at: datetime) -> str:
    """RE-2627-00001: the financial year and its running number. One INSERT ... ON CONFLICT DO UPDATE ...
    RETURNING, so two checkouts never get the same number."""
    period = clock.financial_year(at).replace('-', '')
    stmt = insert(NumberSeries).values(period=period, next_no=2)
    stmt = stmt.on_conflict_do_update(
        index_elements=[NumberSeries.period], set_={'next_no': NumberSeries.next_no + 1}
    ).returning(NumberSeries.next_no - 1)
    return f'RE-{period}-{session.execute(stmt).scalar_one():05d}'


def order_out(order: Order, customer: Customer) -> dict:
    return {
        'id': order.id,
        'number': order.number,
        'status': order.status,
        'lines': order.lines,
        'subtotal': float(order.subtotal),
        'delivery': float(order.delivery),
        'total': float(order.total),
        'address': order.address,
        'notes': order.notes,
        'created_at': order.created_at,
        'paid_at': order.paid_at,
        'razorpay_payment_id': order.razorpay_payment_id,
        'history': order.history,
        'customer': {'name': customer.name, 'email': customer.email, 'phone': customer.phone},
    }


def _priced(session: Session, data: OrderIn) -> list[dict]:
    """The order's lines at today's prices. Every product must be on the website, in stock and have a price."""
    wanted: dict[str, int] = {}
    for line in data.lines:
        wanted[line.product_id] = min(99, wanted.get(line.product_id, 0) + line.qty)
    rows = session.execute(select(Product, Category.visible).join(Category).where(Product.id.in_(wanted))).all()
    found = {product.id: (product, shown) for product, shown in rows}
    problems = []
    lines = []
    for product_id, qty in wanted.items():
        product, shown = found.get(product_id, (None, False))
        if not product or not product.visible or not shown:
            problems.append('one of the products is no longer on the website')
        elif not product.in_stock:
            problems.append(f'{product.name} is out of stock')
        elif product.price is None:
            problems.append(f'{product.name} has no online price (ask us for a quote)')
        else:
            amount = product.price * qty
            lines.append(
                {
                    'product_id': product.id,
                    'name': product.name,
                    'image': image_url(product.image_ids[0], 'card') if product.image_ids else None,
                    'price': float(product.price),
                    'qty': qty,
                    'amount': float(amount),
                }
            )
    if problems:
        sentence = '; '.join(dict.fromkeys(problems))
        raise InvalidInput(f'Please check your cart: {sentence[0].upper()}{sentence[1:]}.')
    return lines


def _payment(order: Order, customer: Customer, settings: Settings) -> dict:
    count = sum(line['qty'] for line in order.lines)
    return {
        'key_id': settings.razorpay_key_id,
        'razorpay_order_id': order.razorpay_order_id,
        'amount': int(order.total * 100),
        'currency': 'INR',
        'name': SHOP_NAME,
        'description': f'Order {order.number} · {count} item{"s" if count != 1 else ""}',
        'prefill': {'name': order.address['name'], 'email': order.address['email'], 'contact': order.address['phone']},
    }


def checkout(session: Session, customer: Customer, data: OrderIn, *, settings: Settings | None = None) -> dict:
    """Makes the order and the Razorpay order to pay it. The same id again (a retry, or the cart changed before
    paying) updates the unpaid order; a paid one is returned as it is, with nothing to pay."""
    settings = settings or get_settings()
    if not settings.payments_enabled:
        raise ServiceUnavailable('Online payment isn’t switched on yet. Please send us a quote request instead.')
    at = clock.now()
    order = session.get(Order, data.id, with_for_update=True)
    if order and order.customer_id != customer.id:
        raise Conflict('That checkout id is already used.')
    if order and order.status != 'pending':
        return {'order': order_out(order, customer), 'payment': None}

    lines = _priced(session, data)
    subtotal = sum((Decimal(str(line['amount'])) for line in lines), Decimal(0))
    shop = site.get_settings(session)
    free = shop.free_delivery_over > 0 and subtotal >= shop.free_delivery_over
    delivery = Decimal(0 if free else shop.delivery_fee)
    total = subtotal + delivery
    if total * 100 < razorpay.MIN_PAISE:
        raise InvalidInput('An online payment must be at least ₹1.')
    address = data.address.model_dump(by_alias=False)

    if order is None:
        order = Order(
            id=data.id,
            number=_next_number(session, at),
            customer_id=customer.id,
            status='pending',
            history=[{'at': at.isoformat(), 'status': 'pending', 'note': 'Checkout started'}],
            created_at=at,
        )
        session.add(order)
    elif order.total != total:
        order.razorpay_order_id = None  # another amount needs another Razorpay order; the same amount pays the same
    order.lines, order.subtotal, order.delivery, order.total = lines, subtotal, delivery, total
    order.address, order.notes, order.updated_at = address, data.notes.strip(), at
    if not order.razorpay_order_id:
        notes = {'order_id': str(order.id), 'customer': customer.email}
        order.razorpay_order_id = razorpay.create_order(int(total * 100), order.number, notes)
    session.commit()
    return {'order': order_out(order, customer), 'payment': _payment(order, customer, settings)}


def _own(session: Session, customer: Customer, order_id: uuid.UUID, *, lock: bool = False) -> Order:
    order = session.get(Order, order_id, with_for_update=lock)
    if not order or order.customer_id != customer.id:
        raise NotFound('No such order.')
    return order


def _mark_paid(order: Order, payment_id: str, note: str, at: datetime) -> None:
    order.status = 'paid'
    order.razorpay_payment_id = payment_id
    order.paid_at = at
    order.updated_at = at
    order.history = [*order.history, {'at': at.isoformat(), 'status': 'paid', 'note': note}]


def _tell_paid(order: dict, settings: Settings) -> None:
    """The customer's confirmation and the shop's copy, after the payment is saved."""
    mail.send(mail.order_paid(order, f'{settings.site_url}/account/orders/{order["id"]}'))
    if settings.admin_email:
        mail.send(mail.order_for_shop(order, settings.admin_email))


def verify(
    session: Session, customer: Customer, order_id: uuid.UUID, razorpay_order_id: str, payment_id: str, signature: str
) -> dict:
    """Confirms a payment the browser reports, by its signature, and marks the order paid (once)."""
    settings = get_settings()
    order = _own(session, customer, order_id, lock=True)
    if order.status != 'pending':
        return order_out(order, customer)
    if razorpay_order_id != order.razorpay_order_id or not razorpay.payment_signature_ok(
        razorpay_order_id, payment_id, signature
    ):
        raise InvalidInput(
            'We couldn’t confirm that payment. If money left your account, contact us with your order number.'
        )
    _mark_paid(order, payment_id, 'Paid online', clock.now())
    session.commit()
    out = order_out(order, customer)
    _tell_paid(out, settings)
    return out


def webhook(session: Session, body: bytes, signature: str) -> None:
    """Razorpay's word that an order was paid (payment.captured, order.paid): the same as verify, for a customer
    who closed the browser before the website could confirm it."""
    if not razorpay.webhook_signature_ok(body, signature):
        raise InvalidInput('Bad signature.')
    event = json.loads(body)
    if event.get('event') not in {'payment.captured', 'order.paid'}:
        return
    payment = event.get('payload', {}).get('payment', {}).get('entity', {})
    razorpay_order_id, payment_id = payment.get('order_id'), payment.get('id')
    if not razorpay_order_id or not payment_id:
        return
    order = session.scalar(select(Order).where(Order.razorpay_order_id == razorpay_order_id).with_for_update())
    if not order:
        log.warning('Razorpay %s paid %s, but no order has it.', razorpay_order_id, payment_id)
        return
    if order.status != 'pending':
        return
    if int(payment.get('amount', 0)) < int(order.total * 100):
        log.warning('Razorpay payment %s for %s is less than the order total.', payment_id, order.number)
        return
    _mark_paid(order, payment_id, 'Paid online (confirmed by Razorpay)', clock.now())
    session.commit()
    _tell_paid(order_out(order, session.get(Customer, order.customer_id)), get_settings())


def list_orders(session: Session, customer: Customer | None = None) -> list[dict]:
    """A customer's orders, or (without one) every order, newest first."""
    stmt = select(Order, Customer).join(Customer, Customer.id == Order.customer_id).order_by(Order.created_at.desc())
    if customer:
        stmt = stmt.where(Order.customer_id == customer.id)
    return [order_out(order, who) for order, who in session.execute(stmt)]


def get_order(session: Session, customer: Customer, order_id: uuid.UUID) -> dict:
    return order_out(_own(session, customer, order_id), customer)


def set_status(session: Session, order_id: uuid.UUID, status: str, note: str) -> dict:
    """The admin moves an order along (or adds a note to it). The customer is emailed when it ships."""
    order = session.get(Order, order_id, with_for_update=True)
    if not order:
        raise NotFound('No such order.')
    note = note.strip()
    if status != order.status and status not in NEXT[order.status]:
        raise Conflict(f'{order.number} is {order.status}, so it can’t be marked {status}.')
    if status == order.status and not note:
        raise InvalidInput('Write a note, or choose another status.')
    at = clock.now()
    shipped = status == 'shipped' and order.status != 'shipped'
    if status == 'paid' and order.status != 'paid':
        order.paid_at = at
    order.status = status
    order.updated_at = at
    order.history = [*order.history, {'at': at.isoformat(), 'status': status, 'note': note}]
    session.commit()
    out = order_out(order, session.get(Customer, order.customer_id))
    if shipped:
        settings = get_settings()
        mail.send(mail.order_shipped(out, f'{settings.site_url}/account/orders/{order.id}', note))
    return out
