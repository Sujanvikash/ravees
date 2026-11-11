"""
Tax invoices the admin's business issued before the app numbered them (ICC000004 to ICC000007), brought in once from
seed/invoices-before-the-app.json by `python -m app.cli import-invoices`, as printed: the showroom and its details,
each line at its printed rate and amount, the printed GST and grand total, and the Manali address they are from.
Each comes in raised, as if the app had raised it on its date, and its goods leave the admin stock now; a product
the admin stock holds less of than was billed goes down to none (the goods have gone). The admin then marks it
paid and adds it to the showroom's stock like any other. An invoice already in is left alone, so running it again
changes nothing.
"""

import json
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.config import BACKEND_DIR
from app.core.errors import InvalidInput
from app.modules.boxes.service import adjust_warehouse
from app.modules.locations import repository as locations
from app.modules.locations.constants import ADMIN_STATE, WAREHOUSE_ID
from app.modules.products import repository as products
from app.modules.stock.models import StockLevel

from .models import TransferInvoice

ISSUED = BACKEND_DIR / 'seed' / 'invoices-before-the-app.json'
CENT = Decimal('0.01')


@dataclass(slots=True)
class Brought:
    """What happened to one invoice: added (with the units taken from the admin stock and any it was short of),
    or already there."""

    number: str
    added: bool
    summary: str = ''
    taken: int = 0
    short: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        if not self.added:
            return f'{self.number}: already in, left alone.'
        short = f' Not enough in the admin stock, taken down to none: {", ".join(self.short)}.' if self.short else ''
        return f'{self.number}: added, {self.summary}; {self.taken:,} units taken from the admin stock.{short}'


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _lines(session: Session, printed: list[dict], tax: Decimal, inter_state: bool) -> list[dict]:
    """The invoice's lines as the app keeps them, with the product's name and cost from the catalogue and the
    printed rate and amount. Each line's GST is worked out as the app does (IGST, or CGST + SGST at half the rate
    each); the paise the printed GST differs by (it was worked out on the total) go on the biggest line, so the
    lines add up to it."""
    catalogue = products.by_codes(session, (line['code'] for line in printed))
    unknown = sorted({line['code'] for line in printed} - set(catalogue))
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    lines = []
    for line in printed:
        product = catalogue[line['code']]
        amount, gst = Decimal(line['amount']), Decimal(product.gst)
        lines.append(
            {
                'code': product.code,
                'name': product.name,
                'hsn': line['hsn'],
                'qty': line['qty'],
                'cost': float(product.cost),
                'rate': float(Decimal(line['rate'])),
                'amount': float(amount),
                'gst': float(gst),
                'tax': _money(amount * gst / 100) if inter_state else 2 * _money(amount * gst / 200),
            }
        )
    biggest = max(lines, key=lambda line: line['amount'])
    biggest['tax'] += tax - sum(line['tax'] for line in lines)
    for line in lines:
        line['tax'] = float(line['tax'])
    return lines


def _take_from_admin(session: Session, wanted: dict[str, int]) -> tuple[int, list[str]]:
    """Takes the invoice's goods out of the admin stock, as far as it holds them. Returns the units taken and the
    products it was short of."""
    have = {
        level.code: max(level.qty, 0)
        for level in session.scalars(
            select(StockLevel).where(StockLevel.location_id == WAREHOUSE_ID, StockLevel.code.in_(wanted))
        )
    }
    take = {code: min(qty, have.get(code, 0)) for code, qty in wanted.items()}
    adjust_warehouse(session, {code: -qty for code, qty in take.items()})
    short = [
        f'{code} (had {have.get(code, 0)}, billed {qty})' for code, qty in wanted.items() if qty > have.get(code, 0)
    ]
    return sum(take.values()), short


def import_issued(session: Session, path: Path = ISSUED) -> list[Brought]:
    """Brings in each invoice in the file that isn't in yet. The caller commits."""
    done = []
    for data in json.loads(path.read_text(encoding='utf-8'))['invoices']:
        number = data['number']
        if session.scalar(select(TransferInvoice.id).where(TransferInvoice.number == number)):
            done.append(Brought(number, added=False))
            continue
        location = locations.get(session, data['location'])
        if not location:
            raise InvalidInput(f'{number}: no showroom “{data["location"]}”.')
        taxable, tax, total = (Decimal(data[key]) for key in ('taxable', 'tax', 'total'))
        inter_state = data['buyer']['state'] != ADMIN_STATE
        lines = _lines(session, data['lines'], tax, inter_state)
        if sum(Decimal(line['amount']) for line in data['lines']) != taxable:
            raise InvalidInput(f'{number}: its lines don’t add up to its taxable value {taxable}.')
        issued = datetime.combine(date.fromisoformat(data['date']), time(12), tzinfo=clock.IST)
        invoice = TransferInvoice(
            id=uuid.uuid4(),
            number=number,
            location_id=location.id,
            status='raised',
            lines=lines,
            markup_pct=Decimal(0),
            subtotal=taxable,
            total=total,
            eway_no='',
            bill_no='',
            doc_name='',
            doc_data=None,
            paid_at=None,
            paid_ref='',
            note='',
            order_id=None,
            buyer=data['buyer'],
            inter_state=inter_state,
            seller_address=data['sellerAddress'],
            history=[
                {
                    'at': issued.isoformat(),
                    'by': 'Admin',
                    'action': 'raised',
                    'note': 'Issued before the app, brought in',
                }
            ],
            created_at=issued,
            updated_at=clock.now(),
        )
        session.add(invoice)
        wanted: dict[str, int] = {}
        for line in lines:
            wanted[line['code']] = wanted.get(line['code'], 0) + line['qty']
        taken, short = _take_from_admin(session, wanted)
        summary = f'{data["buyer"]["name"]} ({location.area}), {len(lines)} lines, Rs {total:,}'
        done.append(Brought(number, added=True, summary=summary, taken=taken, short=short))
    session.flush()
    return done
