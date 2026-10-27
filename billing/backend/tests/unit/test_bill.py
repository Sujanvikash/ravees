from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.core.clock import financial_year
from app.core.errors import InvalidInput
from app.modules.sales import bill
from app.modules.sales.schemas import check_customer, customer_label


@dataclass
class P:
    code: str
    name: str
    mrp: Decimal
    offer: Decimal
    cost: Decimal
    gst: Decimal


CATALOGUE = {
    'TREE': P('TREE', 'Tree 6ft', Decimal(1200), Decimal(999), Decimal(400), Decimal(18)),
    'STAR': P('STAR', 'Star', Decimal(250), Decimal(0), Decimal(80), Decimal(12)),
}


def test_lines_use_the_offer_price_and_add_up_repeats():
    lines = bill.bill_lines([('tree', 1), ('STAR', 2), ('TREE', 1)], CATALOGUE)
    assert [(ln.code, ln.qty, ln.price) for ln in lines] == [('TREE', 2, Decimal(999)), ('STAR', 2, Decimal(250))]


def test_totals_take_gst_out_of_the_price():
    t = bill.totals(bill.bill_lines([('TREE', 2), ('STAR', 2)], CATALOGUE))
    assert t['payable'] == 2498 and t['mrpTotal'] == 2900 and t['savings'] == 402
    assert t['gstRows'] == [
        {'rate': 18.0, 'taxable': 1693.22, 'tax': 304.78},
        {'rate': 12.0, 'taxable': 446.43, 'tax': 53.57},
    ]
    assert t['taxable'] + t['tax'] == pytest.approx(2498)
    assert (t['count'], t['qty'], t['roundOff']) == (2, 4, 0)


def test_unknown_codes_and_empty_bills_are_refused():
    with pytest.raises(InvalidInput, match='NOPE'):
        bill.bill_lines([('NOPE', 1)], CATALOGUE)
    with pytest.raises(InvalidInput, match='at least one'):
        bill.bill_lines([], CATALOGUE)


def test_financial_year_turns_in_april_ist():
    assert financial_year(datetime(2026, 3, 31, 18, 29, tzinfo=UTC)) == '25-26'
    assert financial_year(datetime(2026, 3, 31, 18, 31, tzinfo=UTC)) == '26-27'  # 1 April 00:01 IST


def test_customer_checks():
    assert check_customer('  Priya   Raman ', '+91 98407-88950') == ('Priya Raman', '9840788950')
    for name, phone in (('P', '9840788950'), ('Priya', '12345'), ('Priya', '5840788950')):
        with pytest.raises(ValueError):
            check_customer(name, phone)
    assert customer_label('9840788950', 'Priya') == 'Priya · +91 98407 88950'
