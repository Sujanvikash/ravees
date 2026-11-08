import base64
import binascii
import uuid
from collections.abc import Sequence
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.errors import Conflict, Forbidden, InvalidInput, NotFound
from app.modules.auth.access import acting_location, visible_location
from app.modules.boxes.models import Box
from app.modules.boxes.service import adjust_warehouse
from app.modules.numbering import service as numbering
from app.modules.orders.models import PurchaseOrder, Status
from app.modules.products import repository as products
from app.modules.stock import repository as stock
from app.modules.users.models import User

from .models import TransferInvoice
from .schemas import DocumentsIn, InvoiceIn, PayIn

MARKUP_PCT = Decimal(18)  # the admin bills a showroom the cost price plus this
MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
CENT = Decimal('0.01')


def _admin(user: User) -> None:
    if not user.is_admin:
        raise Forbidden()


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def box_ids_of(session: Session, invoices: Sequence[TransferInvoice]) -> dict[uuid.UUID, list[uuid.UUID]]:
    """The ids of the boxes on each invoice."""
    out: dict[uuid.UUID, list[uuid.UUID]] = {inv.id: [] for inv in invoices}
    if out:
        for box_id, invoice_id in session.execute(
            select(Box.id, Box.invoice_id).where(Box.invoice_id.in_(out)).order_by(Box.box_no)
        ):
            out[invoice_id].append(box_id)
    return out


def list_invoices(session: Session, user: User, location: str | None = None) -> Sequence[TransferInvoice]:
    """Oldest first: a showroom reads its own, the admin every one (or one showroom's)."""
    stmt = select(TransferInvoice).order_by(TransferInvoice.created_at)
    location_id = visible_location(user, location)
    if location_id:
        stmt = stmt.where(TransferInvoice.location_id == location_id)
    return session.scalars(stmt).all()


def _get(session: Session, invoice_id: uuid.UUID) -> TransferInvoice:
    """The invoice, locked until the caller commits so two clicks can't move it on twice."""
    invoice = session.get(TransferInvoice, invoice_id, with_for_update=True)
    if not invoice:
        raise NotFound('No such transfer invoice.')
    return invoice


def _entry(action: str, note: str, at: datetime) -> dict:
    return {'at': at.isoformat(), 'by': 'Admin', 'action': action, **({'note': note} if note else {})}


def _log(invoice: TransferInvoice, action: str, note: str, at: datetime) -> None:
    invoice.history = [*invoice.history, _entry(action, note, at)]  # a new list, so the change is saved
    invoice.updated_at = at


def _expect(invoice: TransferInvoice, allowed: tuple[str, ...], action: str) -> None:
    if invoice.status not in allowed:
        raise Conflict(f'{invoice.number} is {invoice.status}, so it can’t be {action}.')


def _move_boxes(
    boxes: Sequence[Box],
    status: str,
    location: str | None,
    invoice: uuid.UUID | None,
    action: str,
    note: str,
    at: datetime,
) -> None:
    for box in boxes:
        box.status = status
        box.location_id = location
        box.invoice_id = invoice
        box.history = [*box.history, _entry(action, note, at)]
        box.updated_at = at


def _boxes(session: Session, invoice_id: uuid.UUID) -> list[Box]:
    return list(session.scalars(select(Box).where(Box.invoice_id == invoice_id).with_for_update()))


def raise_invoice(session: Session, user: User, data: InvoiceIn, *, at: datetime | None = None) -> TransferInvoice:
    """Bills the scanned boxes to a showroom at cost + the markup. The items leave the admin's stock now and the
    boxes are `invoiced`. The same id sent again returns the first invoice."""
    _admin(user)
    existing = session.get(TransferInvoice, data.id)
    if existing:
        if existing.location_id != data.location:
            raise Conflict('That invoice id is already used.')
        return existing
    at = at or clock.now()
    location = acting_location(session, user, data.location)

    ids = set(data.box_ids)
    boxes = list(session.scalars(select(Box).where(Box.id.in_(ids)).with_for_update().order_by(Box.box_no)))
    if len(boxes) != len(ids):
        raise NotFound('Some of those boxes no longer exist.')
    taken = sorted(b.box_no for b in boxes if b.status != 'in_stock')
    if taken:
        raise Conflict(f'Already on an invoice: box {", ".join(taken)}.')

    order = None
    if data.order_id:
        order = session.get(PurchaseOrder, data.order_id, with_for_update=True)
        if not order or order.location_id != location.id:
            raise NotFound('No such purchase order for that showroom.')
        if order.status != Status.REQUESTED:
            raise Conflict(f'{order.number} is {order.status}, so it can’t be answered.')

    wanted: dict[str, int] = {}
    for box in boxes:
        for line in box.lines:
            wanted[line['code']] = wanted.get(line['code'], 0) + line['qty']
    catalogue = products.by_codes(session, wanted)
    factor = 1 + MARKUP_PCT / 100
    lines, subtotal = [], Decimal(0)
    for code, qty in wanted.items():
        product = catalogue[code]
        rate = _money(Decimal(product.cost) * factor)
        amount = _money(rate * qty)
        subtotal += amount
        lines.append(
            {
                'code': code,
                'name': product.name,
                'qty': qty,
                'cost': float(product.cost),
                'rate': float(rate),
                'amount': float(amount),
            }
        )
    note = data.note.strip()
    invoice = TransferInvoice(
        id=data.id,
        number=numbering.next_transfer_no(session),
        location_id=location.id,
        status='raised',
        lines=lines,
        markup_pct=MARKUP_PCT,
        subtotal=subtotal,
        total=subtotal,
        eway_no='',
        bill_no='',
        doc_name='',
        doc_data=None,
        paid_at=None,
        paid_ref='',
        note=note,
        order_id=order.id if order else None,
        history=[],
        created_at=at,
        updated_at=at,
    )
    _log(invoice, 'raised', note, at)
    session.add(invoice)
    session.flush()  # the boxes point at it
    adjust_warehouse(session, {code: -qty for code, qty in wanted.items()})
    _move_boxes(boxes, 'invoiced', location.id, invoice.id, 'invoiced', f'{invoice.number} to {location.city}', at)
    if order:
        order.status = Status.FULFILLED
        order.history = [*order.history, _entry('fulfilled', invoice.number, at)]
        order.updated_at = at
    session.commit()
    return invoice


def set_documents(
    session: Session, user: User, invoice_id: uuid.UUID, data: DocumentsIn, *, at: datetime | None = None
) -> TransferInvoice:
    """Records the e-way bill number and/or the bill number, and keeps the PDF if one is sent."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('raised', 'paid'), 'changed')
    eway, bill = data.eway_no.strip().upper(), data.bill_no.strip()
    if data.doc_base64:
        try:
            raw = base64.b64decode(data.doc_base64.split(',')[-1], validate=True)
        except (binascii.Error, ValueError):
            raise InvalidInput('The document could not be read; attach the PDF again.') from None
        if len(raw) > MAX_DOCUMENT_BYTES:
            raise InvalidInput('The document is over 2 MB.')
        invoice.doc_data = raw
        invoice.doc_name = data.doc_name.strip() or 'document.pdf'
    invoice.eway_no, invoice.bill_no = eway, bill
    noted = [f'e-way bill {eway}' if eway else '', f'bill {bill}' if bill else '']
    _log(invoice, 'documents', ', '.join(x for x in noted if x), at or clock.now())
    session.commit()
    return invoice


def get_document(session: Session, user: User, invoice_id: uuid.UUID) -> tuple[bytes, str]:
    _admin(user)
    invoice = session.get(TransferInvoice, invoice_id)
    if not invoice or invoice.doc_data is None:
        raise NotFound('No document kept for that invoice.')
    return invoice.doc_data, invoice.doc_name or 'document.pdf'


def pay(
    session: Session, user: User, invoice_id: uuid.UUID, data: PayIn, *, at: datetime | None = None
) -> TransferInvoice:
    """The admin marks the invoice paid, once the e-way bill or bill number is on it."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('raised',), 'marked paid')
    if not (invoice.eway_no or invoice.bill_no):
        raise InvalidInput('Record the e-way bill or bill number first.')
    at = at or clock.now()
    invoice.status = 'paid'
    invoice.paid_at = at
    invoice.paid_ref = data.ref.strip()
    _log(invoice, 'paid', data.note.strip() or invoice.paid_ref, at)
    session.commit()
    return invoice


def add_to_stock(session: Session, user: User, invoice_id: uuid.UUID, *, at: datetime | None = None) -> TransferInvoice:
    """Once paid, the invoice's items are added to the showroom's stock and its boxes are `stocked`."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('paid',), 'added to stock')
    at = at or clock.now()
    stock.adjust(session, invoice.location_id, {line['code']: line['qty'] for line in invoice.lines})
    _move_boxes(_boxes(session, invoice.id), 'stocked', invoice.location_id, invoice.id, 'stocked', invoice.number, at)
    invoice.status = 'stocked'
    _log(invoice, 'stocked', '', at)
    session.commit()
    return invoice


def cancel(
    session: Session, user: User, invoice_id: uuid.UUID, note: str = '', *, at: datetime | None = None
) -> TransferInvoice:
    """Calls the invoice off before it is stocked: the items go back into the admin's stock, the boxes are free
    again and the purchase order it answered is open again."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('raised', 'paid'), 'cancelled')
    at = at or clock.now()
    adjust_warehouse(session, {line['code']: line['qty'] for line in invoice.lines})
    _move_boxes(_boxes(session, invoice.id), 'in_stock', None, None, 'released', invoice.number, at)
    if invoice.order_id:
        order = session.get(PurchaseOrder, invoice.order_id, with_for_update=True)
        if order and order.status == Status.FULFILLED:
            order.status = Status.REQUESTED
            order.history = [*order.history, _entry('reopened', invoice.number, at)]
            order.updated_at = at
    invoice.status = 'cancelled'
    _log(invoice, 'cancelled', note.strip(), at)
    session.commit()
    return invoice
