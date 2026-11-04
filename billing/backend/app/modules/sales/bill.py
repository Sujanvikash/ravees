"""
The sum of a bill or a quotation, the same as the frontend's src/lib/bill.js: each line at its offer price (else
MRP), the MRP total and savings, the taxable value and GST per rate (shown as CGST + SGST), the round-off and
the amount payable. Prices include GST (PRICES_INCLUDE_GST), so GST is taken out of them, not added.

Products and amounts are Decimals; the result is plain numbers rounded to the paisa, as the frontend shows them.
No database here.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
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


class Discount(Protocol):
    """A manual whole-bill discount, as `percent` of the subtotal or a flat `amount` in rupees."""

    kind: str  # 'percent' | 'amount'
    value: float


def discount_off(gross: Decimal, discount: Discount | None) -> Decimal:
    """The rupee amount a manual discount takes off `gross` (the GST-inclusive subtotal), to the paisa.
    A percentage is capped at 100%, a flat amount at the whole subtotal, so the bill never goes negative."""
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

    @property
    def amount(self) -> Decimal:
        return self.price * self.qty


def price_of(product: Priced) -> Decimal:
    """What a product sells for: its offer price when it has one, else MRP."""
    return product.offer or product.mrp


def _num(value: Decimal) -> float:
    return float(value.quantize(PAISA, ROUND_HALF_UP))


def bill_lines(items: Iterable[tuple[str, int]], products: dict[str, Priced]) -> list[BillLine]:
    """(code, qty) pairs → priced lines, in the order given; the same code twice is added together. Raises
    InvalidInput naming any code that isn't in the catalogue."""
    qty_by_code: dict[str, int] = {}
    for code, qty in items:
        key = code.strip().upper()
        qty_by_code[key] = qty_by_code.get(key, 0) + qty
    unknown = [c for c in qty_by_code if c not in products]
    if unknown:
        raise InvalidInput(f'Not in the product list: {", ".join(unknown)}.')
    if not qty_by_code:
        raise InvalidInput('Add at least one product.')
    lines = []
    for code, qty in qty_by_code.items():
        p = products[code]
        lines.append(BillLine(code=p.code, name=p.name, qty=qty, price=price_of(p), mrp=p.mrp, cost=p.cost, gst=p.gst))
    return lines


def totals(lines: Sequence[BillLine], discount: Discount | None = None) -> dict:
    """The bill's figures, in the shape the frontend keeps on a sale or quotation (sale.totals). A manual
    `discount` comes off the selling subtotal and is spread across the GST rates in proportion, so the taxable
    value and GST drop with it (a trade discount), the same as src/lib/bill.js."""
    gross = Decimal(0)
    mrp_total = Decimal(0)
    by_rate: dict[Decimal, list[Decimal]] = {}
    for line in lines:
        gross += line.amount
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
        'savings': _num(mrp_total - gross),
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
