from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput
from app.modules.auth.access import visible_location
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.users.models import User

from . import bill
from .models import Sale, SaleLine
from .schemas import PaymentIn, SaleIn, check_customer

ADMIN_CANNOT_BILL = 'Bills are made at a showroom counter: sign in as the showroom.'


def list_sales(
    session: Session, user: User, location: str | None = None, since: datetime | None = None
) -> Sequence[Sale]:
    """Bills this login may see, oldest first. `since` gives only those saved at or after it (by the server's
    clock), for refreshing a list already loaded."""
    stmt = select(Sale).order_by(Sale.at, Sale.bill_no)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(Sale.location_id == location_id)
    if since:
        stmt = stmt.where(Sale.created_at >= since)
    return session.scalars(stmt).all()


def _payment(payment: PaymentIn, payable: Decimal, credit: Decimal = Decimal(0)) -> dict:
    """The payment as kept on the sale, checked against the amount due. `credit` is the value of goods brought
    back in an exchange; it comes off the amount due first, and if it covers the whole bill nothing is paid."""
    used = min(credit, payable)
    due = payable - used
    extra = {'credit': float(used)} if used else {}
    if due <= 0:
        return {
            'method': 'credit',
            'received': 0,
            'change': 0,
            'approval': '',
            'split': None,
            'print': payment.print,
            **extra,
        }
    if payment.method == 'cash':
        received = Decimal(str(payment.received))
        if received < due:
            raise InvalidInput('The cash received is less than the amount due.')
        return {
            'method': 'cash',
            'received': float(received),
            'change': float(received - due),
            'approval': '',
            'split': None,
            'print': payment.print,
            **extra,
        }
    split = None
    if payment.method == 'split':
        parts = payment.split
        if not parts or parts.cash <= 0 or parts.upi <= 0 or abs(parts.cash + parts.upi - float(due)) > 0.005:
            raise InvalidInput('The cash and UPI parts must both be more than ₹0 and add up to the amount due.')
        split = {'cash': parts.cash, 'upi': float(due) - parts.cash}
    approval = payment.approval.strip() if payment.method == 'card' else ''
    return {
        'method': payment.method,
        'received': float(due),
        'change': 0,
        'approval': approval,
        'split': split,
        'print': payment.print,
        **extra,
    }


def cash_in(payment: dict) -> Decimal:
    """Cash this sale put in the drawer: cash handed over less change, or the cash part of a split."""
    if payment.get('method') == 'cash':
        return Decimal(str(payment.get('received', 0))) - Decimal(str(payment.get('change', 0)))
    if payment.get('method') == 'split' and payment.get('split'):
        return Decimal(str(payment['split'].get('cash', 0)))
    return Decimal(0)


def _existing(session: Session, user: User, data: SaleIn) -> Sale | None:
    sale = session.get(Sale, data.id)
    if sale and sale.location_id != user.location_id:
        raise Conflict('That bill id is already used.')
    return sale


def create_sale(
    session: Session,
    user: User,
    data: SaleIn,
    *,
    at: datetime | None = None,
    credit: Decimal = Decimal(0),
    credit_note: str = '',
    commit: bool = True,
) -> Sale:
    """Saves a bill from a showroom's counter: priced from the catalogue, numbered with the showroom's next bill
    number, and its items taken off the showroom's stock, all in one transaction. A bill whose id is already
    saved is returned as it was, so a retry never bills twice.

    An exchange passes the returned goods' value as `credit` (and its credit note number), and commit=False so
    the return and the new bill are saved together."""
    if user.is_admin or not user.location_id:
        raise Forbidden(ADMIN_CANNOT_BILL)
    if existing := _existing(session, user, data):
        return existing
    try:
        name, phone = check_customer(data.name, data.phone)
    except ValueError as error:
        raise InvalidInput(str(error)) from None

    catalogue = products.by_codes(session, (line.code for line in data.lines))
    lines = bill.bill_lines(((line.code, line.qty) for line in data.lines), catalogue)
    totals = bill.totals(lines)
    payment = _payment(data.payment, Decimal(str(totals['payable'])), credit)
    if credit_note:
        payment['creditNote'] = credit_note

    at = at or clock.now()
    bill_no, _ = numbering.next_bill_no(session, user.location_id, at)
    sale = Sale(
        id=data.id,
        bill_no=bill_no,
        location_id=user.location_id,
        at=at,
        phone=phone,
        name=name,
        totals=totals,
        payment=payment,
        created_by=user.username,
        lines=[
            SaleLine(
                position=i,
                code=line.code,
                name=line.name,
                qty=line.qty,
                price=line.price,
                mrp=line.mrp,
                cost=line.cost,
                gst=line.gst,
            )
            for i, line in enumerate(lines)
        ],
    )
    session.add(sale)
    stock.adjust(session, user.location_id, {line.code: -line.qty for line in lines})
    if not commit:
        session.flush()
        return sale
    try:
        session.commit()
    except IntegrityError:
        # the same bill sent twice at once: the other request saved it first
        session.rollback()
        if existing := _existing(session, user, data):
            return existing
        raise
    return sale
