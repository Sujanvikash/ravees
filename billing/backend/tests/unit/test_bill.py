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


@dataclass
class D:
    kind: str
    value: float


def test_discount_percent_reduces_taxable_and_gst():
    lines = bill.bill_lines([('TREE', 2), ('STAR', 2)], CATALOGUE)  # subtotal 2498
    t = bill.totals(lines, D('percent', 10))
    assert t['discount'] == 249.80 and t['discountKind'] == 'percent' and t['discountValue'] == 10
    assert t['payable'] == 2248  # 2498 − 249.80 = 2248.20, rounded
    # each rate's taxable and GST drop in proportion (a trade discount)
    assert t['gstRows'] == [
        {'rate': 18.0, 'taxable': 1523.90, 'tax': 274.30},
        {'rate': 12.0, 'taxable': 401.79, 'tax': 48.21},
    ]
    assert t['taxable'] + t['tax'] == pytest.approx(2248.20)


def test_discount_amount_is_flat_and_capped():
    lines = bill.bill_lines([('TREE', 2), ('STAR', 2)], CATALOGUE)
    assert bill.totals(lines, D('amount', 500))['payable'] == 1998  # 2498 − 500
    # more than the whole bill is capped, so the bill never goes negative
    t = bill.totals(lines, D('amount', 99999))
    assert t['discount'] == 2498 and t['payable'] == 0


def test_no_discount_leaves_the_fields_empty():
    t = bill.totals(bill.bill_lines([('TREE', 1)], CATALOGUE))
    assert t['discount'] == 0 and t['discountKind'] is None and t['discountValue'] == 0


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


def test_customer_checks_optional_fields():
    # a bill may leave off the name or the mobile when the admin has turned that field off
    assert check_customer('', '9840788950', require_name=False) == ('', '9840788950')
    assert check_customer('Priya', '', require_mobile=False) == ('Priya', '')
    assert check_customer('', '', require_name=False, require_mobile=False) == ('', '')
    # but anything actually typed is still checked, optional or not
    for name, phone, opts in (
        ('P', '9840788950', {'require_name': False}),
        ('Priya', '12345', {'require_mobile': False}),
    ):
        with pytest.raises(ValueError):
            check_customer(name, phone, **opts)
