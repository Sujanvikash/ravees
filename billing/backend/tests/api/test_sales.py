import uuid
from datetime import datetime
from io import BytesIO

import pytest
from openpyxl import load_workbook

from app.core import security
from app.modules.auth import service as auth_service

from .conftest import login

CUSTOMER = {'name': 'Priya Raman', 'phone': '9840788950'}

# stands in for the password for editing bills, which the code keeps only as a hash
EDIT_PASSWORD = 'try-an-edit'
EDIT_PASSWORD_HASH = security.hash_password(EDIT_PASSWORD)


@pytest.fixture
def edit_password(monkeypatch):
    monkeypatch.setattr(auth_service, 'EDIT_BILL_PASSWORD_HASH', EDIT_PASSWORD_HASH)


def stock_of(client, headers, location, code):
    return client.get('/stock', headers=headers).json().get(location, {}).get(code, 0)


def season_code(client, headers, skip=0):
    return [p['code'] for p in client.get('/products', headers=headers).json()['products'] if p['inSeason']][skip]


def sale(lines, method='upi', **payment):
    return {'id': str(uuid.uuid4()), 'lines': lines, **CUSTOMER, 'payment': {'method': method, **payment}}


def test_a_bill_is_priced_numbered_and_comes_off_stock(client, chennai, admin):
    code = season_code(client, chennai)
    before = stock_of(client, chennai, 'chennai', code)
    body = sale([{'code': code.lower(), 'qty': 2}], 'cash', received=100000)
    r = client.post('/sales', json=body, headers=chennai)
    assert r.status_code == 201, r.text
    s = r.json()
    assert s['billNo'].startswith('CHN') and '/' not in s['billNo'] and '-' not in s['billNo']
    assert s['location'] == 'chennai' and s['by'] == 'chennai'
    assert s['lines'][0]['code'] == code and s['lines'][0]['qty'] == 2
    assert s['payment']['change'] == 100000 - s['totals']['payable']
    assert s['customer'] == 'Priya Raman · +91 98407 88950'
    assert stock_of(client, chennai, 'chennai', code) == before - 2

    # the same bill sent again is saved once
    again = client.post('/sales', json=body, headers=chennai).json()
    assert again['billNo'] == s['billNo'] and stock_of(client, chennai, 'chennai', code) == before - 2

    nxt = client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=chennai).json()
    assert int(nxt['billNo'][-5:]) == int(s['billNo'][-5:]) + 1

    ids = {x['id'] for x in client.get('/sales', headers=admin).json()}
    assert s['id'] in ids


def test_who_sees_and_makes_bills(client, chennai, admin):
    code = season_code(client, chennai)
    cochin = login(client, 'cochin')
    client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=cochin)
    assert {x['location'] for x in client.get('/sales', headers=chennai).json()} <= {'chennai'}
    assert 'cochin' in {x['location'] for x in client.get('/sales', headers=admin).json()}
    assert {x['location'] for x in client.get('/sales?location=cochin', headers=admin).json()} == {'cochin'}
    r = client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=admin)
    assert r.status_code == 403
    assert client.get('/stock', headers=chennai).json().keys() <= {'chennai'}


def test_bill_rules(client, chennai):
    code = season_code(client, chennai)

    def refused(body):
        r = client.post('/sales', json=body, headers=chennai)
        assert r.status_code == 422, r.text
        return r.json()['detail']

    assert refused(sale([{'code': 'NOPE1', 'qty': 1}])) == 'Not in the product list: NOPE1.'
    assert refused({**sale([{'code': code, 'qty': 1}]), 'phone': '123'}) == 'Enter a valid 10-digit mobile number.'
    assert (
        refused(sale([{'code': code, 'qty': 1}], 'cash', received=1))
        == 'The cash received is less than the amount due.'
    )
    assert 'add up' in refused(sale([{'code': code, 'qty': 1}], 'split', split={'cash': 1, 'upi': 1}))
    assert 'two' in refused(sale([{'code': code, 'qty': 1}], 'split', split={'cash': 0, 'upi': 0, 'card': 1}))
    assert isinstance(refused(sale([{'code': code, 'qty': 0}])), list)


def test_manual_discount_reduces_the_bill_and_the_server_prices_it(client, chennai):
    code = season_code(client, chennai)
    full = client.post('/sales', json=sale([{'code': code, 'qty': 2}]), headers=chennai).json()['totals']['payable']

    # 10% off: the server works out the rupees and the GST drops with the taxable value
    pct = client.post(
        '/sales',
        json={
            **sale([{'code': code, 'qty': 2}], 'cash', received=100000),
            'discount': {'kind': 'percent', 'value': 10},
        },
        headers=chennai,
    )
    assert pct.status_code == 201, pct.text
    t = pct.json()['totals']
    assert t['discountKind'] == 'percent' and t['discountValue'] == 10
    assert t['discount'] > 0 and t['payable'] == round(full - t['discount'])
    assert t['taxable'] + t['tax'] == pytest.approx(full - t['discount'])
    assert pct.json()['payment']['change'] == 100000 - t['payable']

    # a flat amount bigger than the bill is capped, so the bill never goes negative
    capped = client.post(
        '/sales',
        json={
            **sale([{'code': code, 'qty': 1}], 'cash', received=100000),
            'discount': {'kind': 'amount', 'value': 10_000_000},
        },
        headers=chennai,
    ).json()['totals']
    assert capped['payable'] == 0


def test_split_and_card(client, chennai):
    code = season_code(client, chennai)
    first = client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'card', approval=' 123456 '), headers=chennai)
    payable = first.json()['totals']['payable']
    assert first.json()['payment'] == {
        'method': 'card', 'received': payable, 'change': 0, 'approval': '123456', 'split': None, 'print': False
    }  # fmt: skip
    split = client.post(
        '/sales',
        json=sale([{'code': code, 'qty': 1}], 'split', split={'cash': 100, 'upi': payable - 100}),
        headers=chennai,
    )
    assert split.json()['payment']['split'] == {'cash': 100, 'upi': payable - 100, 'card': 0}
    three = client.post(
        '/sales',
        json=sale([{'code': code, 'qty': 1}], 'split', split={'cash': 50, 'upi': 50, 'card': payable - 100}),
        headers=chennai,
    )
    assert three.status_code == 201, three.text
    assert three.json()['payment']['split'] == {'cash': 50, 'upi': 50, 'card': payable - 100}

    # the sales report's Paid by spells out what each split was made of
    ws = load_workbook(BytesIO(client.get('/reports/sales.xlsx', headers=chennai).content))['Bills']
    paid_by = {
        row[0]: row[[c.value for c in ws[1]].index('Paid by')] for row in ws.iter_rows(min_row=2, values_only=True)
    }
    assert paid_by[first.json()['billNo']] == 'Card'
    assert paid_by[split.json()['billNo']] == f'Split (Cash 100.00 + UPI {payable - 100:,.2f})'
    assert paid_by[three.json()['billNo']] == f'Split (Cash 50.00 + UPI 50.00 + Card {payable - 100:,.2f})'


def test_a_returning_customer_is_found_by_mobile_at_any_showroom(client, chennai):
    code = season_code(client, chennai)
    assert client.post('/sales/customer', json={'phone': '9123456780'}, headers=chennai).json() is None

    client.post(
        '/sales', json={**sale([{'code': code, 'qty': 1}]), 'phone': '9123456780', 'name': 'Anu'}, headers=chennai
    )
    client.post(
        '/sales',
        json={**sale([{'code': code, 'qty': 1}]), 'phone': '+91 91234 56780', 'name': 'Anu Ravi'},
        headers=chennai,
    )

    # another showroom knows them too, by their latest name
    found = client.post('/sales/customer', json={'phone': '9123456780'}, headers=login(client, 'mumbai')).json()
    assert found['name'] == 'Anu Ravi' and found['bills'] == 2 and found['phone'] == '9123456780'

    # only an exact number is looked up, never a part of one
    assert client.post('/sales/customer', json={'phone': '91234'}, headers=chennai).json() is None


def test_a_discount_on_one_product_has_no_limit_and_a_return_gives_back_what_was_paid(client, chennai):
    a, b = season_code(client, chennai), season_code(client, chennai, 1)
    plain = client.post('/sales', json=sale([{'code': a, 'qty': 2}, {'code': b, 'qty': 1}]), headers=chennai).json()
    a_price = plain['lines'][0]['price']

    # 75% off the first product alone, well past the whole-bill limit; the second is untouched
    body = sale([{'code': a, 'qty': 2, 'discount': {'kind': 'percent', 'value': 75}}, {'code': b, 'qty': 1}])
    r = client.post('/sales', json=body, headers=chennai)
    assert r.status_code == 201, r.text
    s = r.json()
    off = round(a_price * 2 * 0.75, 2)
    assert s['lines'][0]['off'] == off and s['lines'][1]['off'] == 0
    assert s['totals']['itemDiscount'] == off
    assert s['totals']['payable'] == round(plain['totals']['payable'] - off)
    assert s['totals']['savings'] == plain['totals']['savings']

    # one of the two discounted pieces comes back at what it sold for, not its full price
    back = client.post(
        '/returns',
        json={'id': str(uuid.uuid4()), 'sale_id': s['id'], 'lines': [{'code': a, 'qty': 1}]},
        headers=chennai,
    )
    assert back.status_code == 201, back.text
    assert back.json()['creditNote']['amount'] == round(a_price * 0.25)


def edit(client, headers, s, lines, password=EDIT_PASSWORD, method='upi', **payment):
    body = {'password': password, 'lines': lines, **CUSTOMER, 'payment': {'method': method, **payment}}
    return client.put(f'/sales/{s["id"]}', json=body, headers=headers)


def test_a_bill_is_edited_with_its_password_and_keeps_its_number(client, chennai, admin, edit_password):
    a, b, c = (season_code(client, chennai, i) for i in range(3))
    s = client.post(
        '/sales', json=sale([{'code': a, 'qty': 2}, {'code': b, 'qty': 1}], 'cash', received=100000), headers=chennai
    ).json()
    stock = {code: stock_of(client, chennai, 'chennai', code) for code in (a, b, c)}

    assert client.post('/sales/edit-password', json={'password': EDIT_PASSWORD}, headers=chennai).status_code == 204
    wrong = client.post('/sales/edit-password', json={'password': 'chennai@2026'}, headers=chennai)
    assert wrong.status_code == 403  # not 401: the counter stays signed in
    assert edit(client, chennai, s, [{'code': a, 'qty': 1}], password='nope').status_code == 403
    assert edit(client, admin, s, [{'code': a, 'qty': 1}]).status_code == 403

    # the customer takes one of A instead of two, drops B and adds C with a discount on it; pays by UPI now
    r = edit(
        client, chennai, s, [{'code': a, 'qty': 1}, {'code': c, 'qty': 1, 'discount': {'kind': 'amount', 'value': 5}}]
    )
    assert r.status_code == 200, r.text
    e = r.json()
    assert (e['id'], e['billNo']) == (s['id'], s['billNo'])
    assert datetime.fromisoformat(e['at']) == datetime.fromisoformat(s['at'])
    assert [(ln['code'], ln['qty']) for ln in e['lines']] == [(a, 1), (c, 1)]
    assert e['lines'][1]['off'] == 5 and e['totals']['itemDiscount'] == 5
    assert e['payment']['method'] == 'upi' and e['payment']['received'] == e['totals']['payable']
    assert stock_of(client, chennai, 'chennai', a) == stock[a] + 1
    assert stock_of(client, chennai, 'chennai', b) == stock[b] + 1
    assert stock_of(client, chennai, 'chennai', c) == stock[c] - 1
    # what it was is kept
    assert len(e['edits']) == 1 and e['edits'][0]['by'] == 'chennai'
    assert e['edits'][0]['totals'] == s['totals'] and e['edits'][0]['payment']['method'] == 'cash'
    assert [x['id'] for x in client.get('/sales', headers=chennai).json()].count(s['id']) == 1

    # again, now as a credit bill with all of it left to pay
    again = edit(client, chennai, e, [{'code': a, 'qty': 1}], later=10_000_000)
    assert again.status_code == 422  # more than the bill
    again = edit(client, chennai, e, [{'code': a, 'qty': 1}], later=e['lines'][0]['price'])
    assert again.status_code == 200, again.text
    assert again.json()['balance'] == round(e['lines'][0]['price']) and len(again.json()['edits']) == 2


def test_a_bill_with_a_return_exchange_or_collection_is_not_edited(client, chennai, edit_password):
    a = season_code(client, chennai)
    returned = client.post('/sales', json=sale([{'code': a, 'qty': 2}]), headers=chennai).json()
    client.post(
        '/returns',
        json={'id': str(uuid.uuid4()), 'sale_id': returned['id'], 'lines': [{'code': a, 'qty': 1}]},
        headers=chennai,
    )
    r = edit(client, chennai, returned, [{'code': a, 'qty': 1}])
    assert r.status_code == 409 and 'Return' in r.json()['detail']

    credit = client.post('/sales', json=sale([{'code': a, 'qty': 1}], later=1), headers=chennai).json()
    client.post(
        f'/sales/{credit["id"]}/collections',
        json={'id': str(uuid.uuid4()), 'amount': 1, 'payment': {'method': 'cash', 'received': 1}},
        headers=chennai,
    )
    assert edit(client, chennai, credit, [{'code': a, 'qty': 1}]).status_code == 409

    other = login(client, 'cochin')
    assert edit(client, other, returned, [{'code': a, 'qty': 1}]).status_code == 404
