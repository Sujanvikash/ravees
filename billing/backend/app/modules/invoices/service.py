import base64
import binascii
import re
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
from app.modules.locations.constants import ADMIN_STATE, HOME_STATE
from app.modules.locations.models import Location
from app.modules.numbering import service as numbering
from app.modules.orders.models import PurchaseOrder, Status
from app.modules.products import repository as products
from app.modules.sales.schemas import LineIn
from app.modules.stock import repository as stock
from app.modules.system import settings as app_settings
from app.modules.users.models import User

from .models import TransferInvoice
from .schemas import BuyerIn, DocumentsIn, InvoiceChangeIn, InvoiceIn, PayIn

MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
CENT = Decimal('0.01')
RUPEE = Decimal(1)


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
        raise NotFound('No such invoice.')
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


def _seller_state(session: Session) -> str:
    """The admin's own state's GST code: from the business GSTIN when it is set, else Tamil Nadu."""
    gstin = app_settings.get(session).biz_gstin.strip()
    return gstin[:2] if gstin[:2].isdigit() else ADMIN_STATE


def _buyer(session: Session, location: Location, given: BuyerIn | None) -> dict:
    """Who the invoice is to: the details entered on it, else the showroom's own (its Settings), with its state (the
    place of supply) from its GSTIN or where the store is. A GSTIN must belong to the state chosen."""
    if given:
        name, address, phone = ' '.join(given.name.split()), given.address.strip(), given.phone.strip()
        gstin, state = given.gstin.strip().upper(), given.state
    else:
        own = app_settings.get(session, location.id)
        name = own.store_name.strip() or f'{location.city} showroom'
        address, phone, gstin = own.store_address.strip(), own.store_phone.strip(), own.gstin.strip().upper()
        state = gstin[:2] if gstin[:2].isdigit() else HOME_STATE.get(location.id, '')
    if not name:
        raise InvalidInput('Enter the showroom’s name for the invoice.')
    if not re.fullmatch(r'\d{2}', state):
        raise InvalidInput(f'Choose {location.city}’s state: it decides between IGST and CGST + SGST.')
    if gstin[:2].isdigit() and gstin[:2] != state:
        raise InvalidInput(f'The GSTIN {gstin} belongs to state code {gstin[:2]}, not {state}.')
    return {'name': name, 'address': address, 'phone': phone, 'gstin': gstin, 'state': state}


def _locked_boxes(session: Session, ids: set[uuid.UUID]) -> list[Box]:
    boxes = list(session.scalars(select(Box).where(Box.id.in_(ids)).with_for_update().order_by(Box.box_no)))
    if len(boxes) != len(ids):
        raise NotFound('Some of those boxes no longer exist.')
    return boxes


def _priced(session: Session, boxes: Sequence[Box], singles: Sequence[LineIn]) -> tuple[dict[str, int], list[dict]]:
    """What the boxes and single products add up to, by code, and the invoice lines for it: each product at its cost
    price (D.Rate) with its own GST rate (18%); nothing else is added. The tax itself is worked out in _fill, once
    it is known whether the showroom is in another state."""
    wanted: dict[str, int] = {}
    for box in boxes:
        for line in box.lines:
            wanted[line['code']] = wanted.get(line['code'], 0) + line['qty']
    for single in singles:  # single products, scanned outside a box
        code = single.code.strip().upper()
        wanted[code] = wanted.get(code, 0) + single.qty
    catalogue = products.by_codes(session, wanted)
    unknown = sorted(set(wanted) - set(catalogue))
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    lines = []
    for code, qty in wanted.items():
        product = catalogue[code]
        rate = _money(Decimal(product.cost))
        amount = _money(rate * qty)
        lines.append(
            {
                'code': code,
                'name': product.name,
                'qty': qty,
                'cost': float(product.cost),
                'rate': float(rate),
                'amount': float(amount),
                'gst': float(product.gst),
            }
        )
    return wanted, lines


def _fill(
    session: Session, invoice: TransferInvoice, location: Location, data: InvoiceChangeIn, lines: list[dict]
) -> None:
    """Puts the showroom, its details, the lines with their GST and the totals, and the note on the invoice. To
    another state a line's GST is IGST at its full rate; inside the admin's own, CGST + SGST at half the rate each,
    worked out on the line so the two are always the same. The total is rounded to the rupee (the round-off)."""
    buyer = _buyer(session, location, data.buyer)
    invoice.location_id = location.id
    invoice.buyer = buyer
    invoice.inter_state = buyer['state'] != _seller_state(session)
    for line in lines:
        amount, rate = Decimal(str(line['amount'])), Decimal(str(line['gst']))
        tax = _money(amount * rate / 100) if invoice.inter_state else 2 * _money(amount * rate / 200)
        line['tax'] = float(tax)
    invoice.lines = lines
    invoice.markup_pct = Decimal(0)
    invoice.subtotal = sum((Decimal(str(line['amount'])) for line in lines), Decimal(0))
    taxed = invoice.subtotal + sum((Decimal(str(line['tax'])) for line in lines), Decimal(0))
    invoice.total = taxed.quantize(RUPEE, rounding=ROUND_HALF_UP)
    invoice.note = data.note.strip()


def raise_invoice(session: Session, user: User, data: InvoiceIn, *, at: datetime | None = None) -> TransferInvoice:
    """Bills the scanned boxes and single products to a showroom at their cost price (D.Rate) with each product's
    GST on top: IGST to another state, CGST + SGST inside the admin's. The items leave the admin's stock now and the
    boxes are `invoiced`. The same id sent again returns the first invoice."""
    _admin(user)
    existing = session.get(TransferInvoice, data.id)
    if existing:
        if existing.location_id != data.location:
            raise Conflict('That invoice id is already used.')
        return existing
    at = at or clock.now()
    location = acting_location(session, user, data.location)
    if not data.box_ids and not data.lines:
        raise InvalidInput('Scan a box or a product to put on the invoice.')

    boxes = _locked_boxes(session, set(data.box_ids))
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

    wanted, lines = _priced(session, boxes, data.lines)
    invoice = TransferInvoice(
        id=data.id,
        number=numbering.next_invoice_no(session),
        status='raised',
        eway_no='',
        bill_no='',
        doc_name='',
        doc_data=None,
        paid_at=None,
        paid_ref='',
        order_id=order.id if order else None,
        history=[],
        created_at=at,
        updated_at=at,
    )
    _fill(session, invoice, location, data, lines)
    _log(invoice, 'raised', invoice.note, at)
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


def edit_invoice(
    session: Session, user: User, invoice_id: uuid.UUID, data: InvoiceChangeIn, *, at: datetime | None = None
) -> TransferInvoice:
    """Changes an invoice that isn't paid yet: its showroom and their details, its boxes, single products and note.
    The admin stock and the boxes change by the difference. An invoice answering a purchase order keeps its
    showroom."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('raised',), 'edited')
    at = at or clock.now()
    location = acting_location(session, user, data.location)
    if invoice.order_id and location.id != invoice.location_id:
        raise InvalidInput('This invoice answers a showroom’s purchase order, so its showroom can’t change.')
    if not data.box_ids and not data.lines:
        raise InvalidInput('Scan a box or a product to put on the invoice.')

    ids = set(data.box_ids)
    current = _boxes(session, invoice.id)
    boxes = _locked_boxes(session, ids)
    taken = sorted(b.box_no for b in boxes if b.status != 'in_stock' and b.invoice_id != invoice.id)
    if taken:
        raise Conflict(f'Already on an invoice: box {", ".join(taken)}.')

    wanted, lines = _priced(session, boxes, data.lines)
    had = {line['code']: line['qty'] for line in invoice.lines}
    adjust_warehouse(session, {code: had.get(code, 0) - wanted.get(code, 0) for code in had.keys() | wanted.keys()})
    _move_boxes([b for b in current if b.id not in ids], 'in_stock', None, None, 'released', invoice.number, at)
    _move_boxes(
        [b for b in boxes if b.invoice_id != invoice.id],
        'invoiced',
        location.id,
        invoice.id,
        'invoiced',
        f'{invoice.number} to {location.city}',
        at,
    )
    for box in boxes:
        box.location_id = location.id
    _fill(session, invoice, location, data, lines)
    _log(invoice, 'edited', '', at)
    session.commit()
    return invoice


def set_documents(
    session: Session, user: User, invoice_id: uuid.UUID, data: DocumentsIn, *, at: datetime | None = None
) -> TransferInvoice:
    """Records the e-way bill number and/or the bill number, and keeps the PDF if one is sent. Only once the invoice
    is paid: the goods move, and the e-way bill is made, after payment."""
    _admin(user)
    invoice = _get(session, invoice_id)
    if invoice.status == 'raised':
        raise Conflict(f'{invoice.number} isn’t paid yet: record the e-way bill once it is.')
    _expect(invoice, ('paid', 'stocked'), 'changed')
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
    """The admin marks the invoice paid; the e-way bill is recorded after this."""
    _admin(user)
    invoice = _get(session, invoice_id)
    _expect(invoice, ('raised',), 'marked paid')
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
