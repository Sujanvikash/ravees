import uuid
from collections.abc import Sequence

from fastapi import APIRouter, Response, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .models import TransferInvoice
from .schemas import DocumentsIn, InvoiceChangeIn, InvoiceIn, InvoiceOut, PayIn

router = APIRouter(prefix='/transfer-invoices', tags=['transfer-invoices'])

CONFLICT = {409: {'description': 'The invoice has already moved on (paid, stocked or cancelled)'}}


def _out(session: DbSession, invoices: Sequence[TransferInvoice]) -> list[InvoiceOut]:
    boxes = service.box_ids_of(session, invoices)
    return [InvoiceOut.from_model(i, boxes[i.id]) for i in invoices]


@router.get('')
def list_invoices(user: CurrentUser, session: DbSession, location: str | None = None) -> list[InvoiceOut]:
    """Invoices, oldest first: a showroom's own (read only), or for the admin every one."""
    return _out(session, service.list_invoices(session, user, location))


@router.post('', status_code=status.HTTP_201_CREATED, responses={409: {'description': 'A box is already invoiced'}})
def raise_invoice(body: InvoiceIn, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: bills the scanned boxes and single products to a showroom at cost price (D.Rate) plus GST; the items
    leave the admin's stock."""
    return _out(session, [service.raise_invoice(session, user, body)])[0]


@router.put('/{invoice_id}', responses=CONFLICT)
def edit_invoice(invoice_id: uuid.UUID, body: InvoiceChangeIn, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: changes an invoice not paid yet (showroom and its details, boxes, single products, note); the admin
    stock and the boxes change by the difference."""
    return _out(session, [service.edit_invoice(session, user, invoice_id, body)])[0]


@router.put('/{invoice_id}/documents', responses=CONFLICT)
def set_documents(invoice_id: uuid.UUID, body: DocumentsIn, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: once paid, records the e-way bill and/or bill number, and optionally keeps the PDF."""
    return _out(session, [service.set_documents(session, user, invoice_id, body)])[0]


@router.get('/{invoice_id}/document', response_class=Response, responses={200: {'content': {'application/pdf': {}}}})
def get_document(invoice_id: uuid.UUID, user: CurrentUser, session: DbSession) -> Response:
    """Admin: the PDF kept with the invoice."""
    data, name = service.get_document(session, user, invoice_id)
    safe = name.replace('"', '')
    return Response(data, media_type='application/pdf', headers={'Content-Disposition': f'inline; filename="{safe}"'})


@router.post('/{invoice_id}/pay', responses=CONFLICT)
def pay(invoice_id: uuid.UUID, body: PayIn, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: marks the invoice paid."""
    return _out(session, [service.pay(session, user, invoice_id, body)])[0]


@router.post('/{invoice_id}/stock', responses=CONFLICT)
def add_to_stock(invoice_id: uuid.UUID, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: once paid, adds the invoice's items to the showroom's stock."""
    return _out(session, [service.add_to_stock(session, user, invoice_id)])[0]


@router.post('/{invoice_id}/cancel', responses=CONFLICT)
def cancel(invoice_id: uuid.UUID, user: CurrentUser, session: DbSession) -> InvoiceOut:
    """Admin: calls the invoice off; the items go back to the admin's stock."""
    return _out(session, [service.cancel(session, user, invoice_id)])[0]
