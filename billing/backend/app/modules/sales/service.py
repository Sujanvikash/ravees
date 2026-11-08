import uuid
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import visible_location
from app.modules.numbering import service as numbering
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.system import settings as app_settings
from app.modules.users.models import User

from . import bill
from .models import Sale, SaleCollection, SaleLine
from .schemas import CollectionIn, CustomerOut, PaymentIn, SaleIn, check_customer, phone_digits

ADMIN_CANNOT_BILL = 'Bills are made at a showroom counter: sign in as the showroom.'
ADMIN_CANNOT_COLLECT = 'A balance is collected at the showroom counter: sign in as the showroom.'
CREDIT_NEEDS_CUSTOMER = 'A credit bill needs the customer’s name and mobile number, to collect the balance.'
ADMIN_CANNOT_GO_OFFLINE = 'Only a showroom counter bills offline.'
NO_MORE_COUNTERS = 'This showroom already has 99 offline counters; ask for help to reset them.'
BAD_OFFLINE_NO = 'That offline bill number isn’t one this showroom’s counters were given.'
OFFLINE_NO_TAKEN = 'That offline bill number is already used by another bill.'
PAISA = Decimal('0.01')


def list_sales(
    session: Session, user: User, location: str | None = None, since: datetime | None = None
) -> Sequence[Sale]:
    """Bills this login may see, oldest first. `since` gives only those saved or changed (a balance collected,
    goods returned against a credit bill) at or after it, by the server's clock, for refreshing a list already
    loaded."""
    stmt = select(Sale).order_by(Sale.at, Sale.bill_no)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(Sale.location_id == location_id)
    if since:
        stmt = stmt.where(Sale.updated_at >= since)
    return session.scalars(stmt).all()


def find_customer(session: Session, phone: str) -> CustomerOut | None:
    """The customer with this mobile number, from their bills at any showroom, or None for a new one. Only an
    exact 10-digit number is looked up, so a showroom can't list other showrooms' customers."""
    digits = phone_digits(phone)
    if len(digits) != 10:
        return None
    bills, last = session.execute(select(func.count(), func.max(Sale.at)).where(Sale.phone == digits)).one()
    if not bills:
        return None
    name = session.scalar(
        select(Sale.name).where(Sale.phone == digits, Sale.name != '').order_by(Sale.at.desc()).limit(1)
    )
    return CustomerOut(phone=digits, name=name or '', bills=bills, last=last)


def _payment(
    payment: PaymentIn,
    payable: Decimal,
    credit: Decimal = Decimal(0),
    *,
    later: bool = True,
    lenient: bool = False,
) -> dict:
    """The payment as kept on the sale, checked against the amount due. `credit` is the value of goods brought
    back in an exchange; it comes off the amount due first, and if it covers the whole bill nothing is paid.
    Then `payment.later` (a credit bill) is left to pay later, kept as 'later', and the method pays the rest;
    when nothing is paid now the method is 'later'. later=False ignores it (a collection is paid in full).

    lenient=True is for a bill made offline: the money has already changed hands, so it is recorded as it was
    rather than refused, even if a price changed on the server since the counter last loaded the catalogue."""
    used = min(credit, payable)
    due = payable - used
    extra = {'credit': float(used)} if used else {}
    owed = Decimal(str(payment.later)).quantize(PAISA) if later else Decimal(0)
    if owed > due and lenient:
        owed = due
    if owed > due:
        raise InvalidInput('The amount left to pay later is more than the amount due.')
    if owed > 0:
        extra['later'] = float(owed)
        due -= owed
    if due <= 0:
        return {
            'method': 'later' if owed > 0 else 'credit',
            'received': 0,
            'change': 0,
            'approval': '',
            'split': None,
            'print': payment.print,
            **extra,
        }
    if payment.method == 'cash':
        received = Decimal(str(payment.received))
        if received < due and not lenient:
            raise InvalidInput('The cash received is less than the amount due.')
        return {
            'method': 'cash',
            'received': float(received),
            'change': float(max(received - due, Decimal(0))),
            'approval': '',
            'split': None,
            'print': payment.print,
            **extra,
        }
    split = None
    if payment.method == 'split':
        parts = payment.split
        paid = [parts.cash, parts.upi, parts.card] if parts else []
        if not lenient and (sum(v > 0 for v in paid) < 2 or abs(sum(paid) - float(due)) > 0.005):
            raise InvalidInput('Use at least two of cash, UPI and card, and make them add up to the amount due.')
        cash, upi = (parts.cash, parts.upi) if parts else (0, 0)
        # the card part takes up any paisa of rounding
        split = {'cash': cash, 'upi': upi, 'card': max(float(due) - cash - upi, 0)}
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


def takings(payment: dict) -> tuple[Decimal, Decimal, Decimal]:
    """What a payment (a bill's, or a collection's) brought in: cash into the drawer, UPI and card."""
    method = payment.get('method')
    if method == 'upi':
        return Decimal(0), Decimal(str(payment.get('received', 0))), Decimal(0)
    if method == 'card':
        return Decimal(0), Decimal(0), Decimal(str(payment.get('received', 0)))
    if method == 'split' and payment.get('split'):
        split = payment['split']
        return tuple(Decimal(str(split.get(k, 0))) for k in ('cash', 'upi', 'card'))  # type: ignore[return-value]
    return cash_in(payment), Decimal(0), Decimal(0)


def offline_counter(session: Session, user: User) -> int:
    """A new offline counter number for a browser at this showroom (see numbering.next_offline_counter)."""
    if user.is_admin or not user.location_id:
        raise Forbidden(ADMIN_CANNOT_GO_OFFLINE)
    counter = numbering.next_offline_counter(session, user.location_id)
    if counter is None:
        raise Conflict(NO_MORE_COUNTERS)
    session.commit()
    return counter


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

    A bill made offline (data.offline) keeps the number and time printed on its receipt, and is recorded as it
    was paid (see _payment's lenient): it happened already, so it is not turned away now.

    An exchange passes the returned goods' value as `credit` (and its credit note number), and commit=False so
    the return and the new bill are saved together."""
    if user.is_admin or not user.location_id:
        raise Forbidden(ADMIN_CANNOT_BILL)
    if existing := _existing(session, user, data):
        return existing
    offline = data.offline
    if offline:
        # the counter's clock may run a little fast; a bill is never later than now
        at = min(offline.at, clock.now())
        if not numbering.check_offline_bill_no(session, user.location_id, offline.bill_no, at):
            raise InvalidInput(BAD_OFFLINE_NO)
        if session.scalar(select(Sale.id).where(Sale.bill_no == offline.bill_no)):
            raise Conflict(OFFLINE_NO_TAKEN)
    prefs = app_settings.get(session)
    # a credit bill always needs the customer's name and mobile, whatever the admin's settings: it's who owes
    credit_bill = data.payment.later > 0
    try:
        name, phone = check_customer(
            data.name,
            data.phone,
            require_name=prefs.require_name or credit_bill,
            require_mobile=prefs.require_mobile or credit_bill,
        )
    except ValueError as error:
        raise InvalidInput(f'{CREDIT_NEEDS_CUSTOMER} {error}' if credit_bill else str(error)) from None

    catalogue = products.by_codes(session, (line.code for line in data.lines))
    lines = bill.bill_lines(((line.code, line.qty) for line in data.lines), catalogue)
    totals = bill.totals(lines, data.discount)
    payment = _payment(data.payment, Decimal(str(totals['payable'])), credit, lenient=offline is not None)
    if credit_note:
        payment['creditNote'] = credit_note

    at = at or clock.now()
    bill_no = offline.bill_no if offline else numbering.next_bill_no(session, user.location_id, at)[0]
    sale = Sale(
        id=data.id,
        bill_no=bill_no,
        location_id=user.location_id,
        at=at,
        phone=phone,
        name=name,
        totals=totals,
        payment=payment,
        balance=Decimal(str(payment.get('later', 0))),
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
        if offline:
            raise Conflict(OFFLINE_NO_TAKEN) from None
        raise
    return sale


def collect(
    session: Session, user: User, sale_id: uuid.UUID, data: CollectionIn, *, at: datetime | None = None
) -> Sale:
    """Takes a payment towards what is still owed on one of this showroom's credit bills: all of the balance or
    part of it, by cash, UPI, card or a split. It gets its own receipt number and brings the balance down. The
    same payment id sent again returns the bill as it is, so a retry never collects twice."""
    if user.is_admin or not user.location_id:
        raise Forbidden(ADMIN_CANNOT_COLLECT)
    if existing := session.get(SaleCollection, data.id):
        if existing.location_id != user.location_id or existing.sale_id != sale_id:
            raise Conflict('That payment id is already used.')
        return session.get(Sale, existing.sale_id)
    sale = session.get(Sale, sale_id, with_for_update=True, populate_existing=True)
    if sale is None or sale.location_id != user.location_id:
        raise NotFound('That bill isn’t one of this showroom’s.')
    if sale.balance <= 0:
        raise Conflict(f'{sale.bill_no} is already paid in full.')
    amount = Decimal(str(data.amount)).quantize(PAISA)
    if amount > sale.balance:
        raise InvalidInput(f'Only ₹{sale.balance:,.2f} is still owed on {sale.bill_no}.')

    payment = _payment(data.payment, amount, later=False)
    # what was owed just before and just after, kept so a reprinted receipt says what it said on the day
    payment |= {'before': float(sale.balance), 'after': float(sale.balance - amount)}
    at = at or clock.now()
    sale.collections.append(
        SaleCollection(
            id=data.id,
            receipt_no=numbering.next_receipt_no(session, user.location_id, at),
            location_id=user.location_id,
            at=at,
            amount=amount,
            payment=payment,
            created_by=user.username,
        )
    )
    sale.balance -= amount
    try:
        session.commit()
    except IntegrityError:
        # the same payment sent twice at once: the other request saved it first
        session.rollback()
        if existing := session.get(SaleCollection, data.id):
            return session.get(Sale, existing.sale_id)
        raise
    return sale
