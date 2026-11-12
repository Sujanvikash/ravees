"""
The tax invoice of a paid order. Prices on the website include GST at 18%, so each line's taxable value is worked
back from what the customer paid (amount × 100 / 118) and the tax is the rest: the invoice always adds up to the
amount paid, to the paisa. Within the seller's state the tax is split into CGST and SGST (9% each); to another state
it is IGST (18%). The delivery charge is taxed at the same rate as the goods it delivers.

The seller's details are copied onto the order when it is invoiced (order.seller), so an invoice never changes when
the admin later edits them.
"""

from decimal import ROUND_HALF_UP, Decimal

from app.core.india import STATES, rupees_in_words, state_code

from .models import Order

GST_RATE = 18
DEFAULT_HSN = '9505'  # festive articles: Christmas trees and decorations
DELIVERY_SAC = '9965'  # goods transport services
PAISA = Decimal('0.01')


def _money(value: Decimal) -> Decimal:
    return value.quantize(PAISA, ROUND_HALF_UP)


def _split(amount: Decimal) -> tuple[Decimal, Decimal]:
    """An amount that includes GST, as (taxable value, tax)."""
    taxable = _money(amount * 100 / (100 + GST_RATE))
    return taxable, amount - taxable


def _line(description: str, hsn: str, qty: int, amount: Decimal) -> dict:
    taxable, tax = _split(amount)
    return {
        'description': description,
        'hsn': hsn,
        'qty': qty,
        'rate': float(_money(taxable / qty)),
        'taxable': float(taxable),
        'tax': float(tax),
        'amount': float(amount),
    }


def invoice_out(order: Order) -> dict | None:
    """The invoice as the website prints it, or None for an order that isn't invoiced (not paid)."""
    if not order.invoice_no or not order.seller:
        return None
    seller = order.seller
    address = order.address
    buyer_code = state_code(address.get('state', ''))
    intra_state = buyer_code == seller.get('state_code')

    lines = [
        _line(line['name'], line.get('hsn') or DEFAULT_HSN, line['qty'], Decimal(str(line['amount'])))
        for line in order.lines
    ]
    if order.delivery:
        lines.append(_line('Delivery charges', DELIVERY_SAC, 1, order.delivery))
    taxable = sum((Decimal(str(line['taxable'])) for line in lines), Decimal(0))
    tax = sum((Decimal(str(line['tax'])) for line in lines), Decimal(0))
    half = _money(tax / 2)

    return {
        'number': order.invoice_no,
        'date': order.invoiced_at,
        'order_number': order.number,
        'seller': seller,
        'buyer': {
            'name': address.get('name', ''),
            'lines': [p for p in (address.get('line1'), address.get('line2')) if p]
            + [f'{address.get("city", "")}, {address.get("state", "")} – {address.get("pincode", "")}'],
            'phone': address.get('phone', ''),
            'email': address.get('email', ''),
        },
        'place_of_supply': f'{STATES[buyer_code]} ({buyer_code})' if buyer_code else address.get('state', ''),
        'intra_state': intra_state,
        'gst_rate': GST_RATE,
        'lines': lines,
        'taxable': float(taxable),
        'cgst': float(half) if intra_state else 0.0,
        'sgst': float(tax - half) if intra_state else 0.0,
        'igst': 0.0 if intra_state else float(tax),
        'total': float(order.total),
        'amount_in_words': rupees_in_words(order.total),
        'payment_id': order.razorpay_payment_id,
        'paid_at': order.paid_at,
    }
