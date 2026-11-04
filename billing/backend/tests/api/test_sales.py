import uuid

import pytest

from .conftest import login

CUSTOMER = {'name': 'Priya Raman', 'phone': '9840788950'}


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
    goa = login(client, 'goa')
    client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=goa)
    assert {x['location'] for x in client.get('/sales', headers=chennai).json()} <= {'chennai'}
    assert 'goa' in {x['location'] for x in client.get('/sales', headers=admin).json()}
    assert {x['location'] for x in client.get('/sales?location=goa', headers=admin).json()} == {'goa'}
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
