import uuid

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
    assert s['billNo'].startswith('CHN/') and s['location'] == 'chennai' and s['by'] == 'chennai'
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
    assert isinstance(refused(sale([{'code': code, 'qty': 0}])), list)


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
    assert split.json()['payment']['split'] == {'cash': 100, 'upi': payable - 100}
