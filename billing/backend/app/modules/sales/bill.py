"""
The sum of a bill or a quotation, the same as the frontend's src/lib/bill.js: each line at its offer price (else
MRP), less any manual discount on that line alone, the MRP total and savings, the taxable value and GST per rate
(shown as CGST + SGST), the round-off and the amount payable. Prices include GST (PRICES_INCLUDE_GST), so GST is
taken out of them, not added.

Products and amounts are Decimals; the result is plain numbers rounded to the paisa, as the frontend shows them.
No database here.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, replace
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol

from app.core.errors import InvalidInput

PRICES_INCLUDE_GST = True
PAISA = Decimal('0.01')


class Priced(Protocol):
    code: str
    name: str
    mrp: Decimal
    offer: Decimal
    cost: Decimal
    gst: Decimal


class Sold(Protocol):
    """A line already on a bill, as it was billed (a SaleLine)."""

    code: str
    name: str
    price: Decimal
    mrp: Decimal
    cost: Decimal
    gst: Decimal


class Discount(Protocol):
    """A manual discount, on the whole bill or on one line of it: `percent` of it or a flat `amount` in rupees."""

    kind: str  # 'percent' | 'amount'
    value: float


def discount_off(gross: Decimal, discount: Discount | None) -> Decimal:
    """The rupee amount a manual discount takes off `gross` (the GST-inclusive subtotal, or one line's amount), to
    the paisa. A percentage is capped at 100%, a flat amount at the whole of `gross`, so nothing goes negative."""
    if not discount or discount.value <= 0:
        return Decimal(0)
    if discount.kind == 'percent':
        off = gross * min(Decimal(str(discount.value)), Decimal(100)) / 100
    else:
        off = min(Decimal(str(discount.value)), gross)
    return off.quantize(PAISA, ROUND_HALF_UP)


@dataclass(frozen=True, slots=True)
class BillLine:
    code: str
    name: str
    qty: int
    price: Decimal
    mrp: Decimal
    cost: Decimal
    gst: Decimal
    off: Decimal = Decimal(0)  # a manual discount on this line alone, in rupees

    @property
    def listed(self) -> Decimal:
        """The line at its selling price, before its own discount."""
        return self.price * self.qty

    @property
    def amount(self) -> Decimal:
        return self.listed - self.off


def price_of(product: Priced) -> Decimal:
    """What a product sells for: its offer price when it has one, else MRP."""
    return product.offer or product.mrp


def _num(value: Decimal) -> float:
    return float(value.quantize(PAISA, ROUND_HALF_UP))


def bill_lines(
    items: Iterable[tuple[str, int]],
    products: dict[str, Priced],
    *,
    discounts: dict[str, Discount] | None = None,
    sold: dict[str, Sold] | None = None,
) -> list[BillLine]:
    """(code, qty) pairs → priced lines, in the order given; the same code twice is added together. Raises
    InvalidInput naming any code that isn't in the catalogue.

    `discounts` takes a manual discount off single lines, by code: any amount, held only to the line's own (there
    is no limit as there is for the whole bill's). `sold` has the lines of a bill being edited, by code: those
    keep the price, MRP, cost and GST they were billed at, and only the others are priced from the catalogue."""
    discounts = discounts or {}
    sold = sold or {}
    qty_by_code: dict[str, int] = {}
    for code, qty in items:
        key = code.strip().upper()
        qty_by_code[key] = qty_by_code.get(key, 0) + qty
    unknown = [c for c in qty_by_code if c not in products and c not in sold]
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    if not qty_by_code:
        raise InvalidInput('Add at least one product.')
    lines = []
    for code, qty in qty_by_code.items():
        if code in sold:
            s = sold[code]
            line = BillLine(code=s.code, name=s.name, qty=qty, price=s.price, mrp=s.mrp, cost=s.cost, gst=s.gst)
        else:
            p = products[code]
            line = BillLine(code=p.code, name=p.name, qty=qty, price=price_of(p), mrp=p.mrp, cost=p.cost, gst=p.gst)
        off = discount_off(line.listed, discounts.get(code))
        lines.append(replace(line, off=off) if off else line)
    return lines


def totals(lines: Sequence[BillLine], discount: Discount | None = None) -> dict:
    """The bill's figures, in the shape the frontend keeps on a sale or quotation (sale.totals). The lines' own
    discounts (itemDiscount) come off them first; then a manual whole-bill `discount` comes off the selling
    subtotal and is spread across the GST rates in proportion, so the taxable value and GST drop with it (a trade
    discount), the same as src/lib/bill.js. `savings` is the catalogue's offers only, MRP → selling price."""
    gross = Decimal(0)
    listed = Decimal(0)
    item_off = Decimal(0)
    mrp_total = Decimal(0)
    by_rate: dict[Decimal, list[Decimal]] = {}
    for line in lines:
        gross += line.amount
        listed += line.listed
        item_off += line.off
        mrp_total += line.mrp * line.qty
        if PRICES_INCLUDE_GST:
            taxable = line.amount / (1 + line.gst / 100)
            tax = line.amount - taxable
        else:
            taxable = line.amount
            tax = line.amount * line.gst / 100
        row = by_rate.setdefault(line.gst, [Decimal(0), Decimal(0)])
        row[0] += taxable
        row[1] += tax

    off = discount_off(gross, discount)
    factor = (gross - off) / gross if gross else Decimal(1)
    rates = sorted(by_rate, reverse=True)
    taxable_total = sum((by_rate[r][0] * factor for r in rates), Decimal(0))
    tax_total = sum((by_rate[r][1] * factor for r in rates), Decimal(0))
    net = gross - off
    exact = net if PRICES_INCLUDE_GST else net + tax_total
    payable = exact.quantize(Decimal(1), ROUND_HALF_UP)
    return {
        'count': len(lines),
        'qty': sum(line.qty for line in lines),
        'mrpTotal': _num(mrp_total),
        'savings': _num(mrp_total - listed),
        'itemDiscount': _num(item_off),
        'discount': _num(off),
        'discountKind': discount.kind if off > 0 else None,
        'discountValue': float(discount.value) if off > 0 else 0,
        'taxable': _num(taxable_total),
        'tax': _num(tax_total),
        'gstRows': [
            {'rate': float(r), 'taxable': _num(by_rate[r][0] * factor), 'tax': _num(by_rate[r][1] * factor)}
            for r in rates
        ],
        'roundOff': _num(payable - exact),
        'payable': float(payable),
    }
