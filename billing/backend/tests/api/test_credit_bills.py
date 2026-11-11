import uuid
from datetime import UTC, datetime, timedelta

from .conftest import login
from .test_sales import CUSTOMER, sale


def dear_code(client, headers):
    """A season product of ₹1,000 or more, so the parts paid now and later below fit inside its bill."""
    products = client.get('/products', headers=headers).json()['products']
    return next(p['code'] for p in products if p['inSeason'] and (p['offer'] or p['mrp']) >= 1000)


def payable_of(client, headers, lines):
    """What a bill for these lines comes to (a throwaway UPI bill)."""
    return client.post('/sales', json=sale(lines), headers=headers).json()['totals']['payable']


def collect(client, headers, sale_id, amount, method='cash', **payment):
    body = {'id': str(uuid.uuid4()), 'amount': amount, 'payment': {'method': method, **payment}}
    return client.post(f'/sales/{sale_id}/collections', json=body, headers=headers)


def test_a_credit_bill_takes_part_now_and_owes_the_rest(client, chennai):
    lines = [{'code': dear_code(client, chennai), 'qty': 3}]
    total = payable_of(client, chennai, lines)

    r = client.post('/sales', json=sale(lines, 'cash', received=1000, later=total - 1000), headers=chennai)
    assert r.status_code == 201, r.text
    s = r.json()
    assert s['payment']['method'] == 'cash' and s['payment']['later'] == total - 1000
    assert s['payment']['received'] == 1000 and s['payment']['change'] == 0
    assert s['balance'] == total - 1000 and s['collections'] == []

    # nothing paid now: the whole bill is owed
    none = client.post('/sales', json=sale(lines, 'upi', later=total), headers=chennai).json()
    assert none['payment']['method'] == 'later' and none['balance'] == total

    # an ordinary bill owes nothing
    assert client.post('/sales', json=sale(lines), headers=chennai).json()['balance'] == 0


def test_credit_bill_rules(client, chennai):
    lines = [{'code': dear_code(client, chennai), 'qty': 1}]
    total = payable_of(client, chennai, lines)

    def refused(body):
        r = client.post('/sales', json=body, headers=chennai)
        assert r.status_code == 422, r.text
        return r.json()['detail']

    walk_in = {**sale(lines, 'upi', later=total), 'name': '', 'phone': ''}
    assert refused(walk_in).startswith('A credit bill needs the customer’s name and mobile number')
    assert refused(sale(lines, 'upi', later=total + 1)) == 'The amount left to pay later is more than the amount due.'
    # the cash handed over is checked against the part paid now, not the whole bill
    assert 'less than' in refused(sale(lines, 'cash', received=1, later=total - 100))


def test_collecting_the_balance_in_parts(client, chennai, admin):
    lines = [{'code': dear_code(client, chennai), 'qty': 3}]
    total = payable_of(client, chennai, lines)
    s = client.post('/sales', json=sale(lines, 'upi', later=total), headers=chennai).json()

    first = collect(client, chennai, s['id'], 500, 'upi')
    assert first.status_code == 201, first.text
    after = first.json()
    assert after['balance'] == total - 500
    (c,) = after['collections']
    assert c['receiptNo'].startswith('RC-CHN') and c['amount'] == 500 and c['payment']['method'] == 'upi'
    assert c['payment']['before'] == total and c['payment']['after'] == total - 500

    over = collect(client, chennai, s['id'], total)
    assert over.status_code == 422 and over.json()['detail'].startswith('Only ₹')

    # the rest by a split of cash and card; sent twice, it is collected once
    rest = total - 500
    body = {
        'id': str(uuid.uuid4()),
        'amount': rest,
        'payment': {'method': 'split', 'split': {'cash': 200, 'upi': 0, 'card': rest - 200}},
    }
    done = client.post(f'/sales/{s["id"]}/collections', json=body, headers=chennai).json()
    again = client.post(f'/sales/{s["id"]}/collections', json=body, headers=chennai)
    assert done['balance'] == 0 and len(done['collections']) == 2
    assert again.status_code == 201 and len(again.json()['collections']) == 2
    assert done['collections'][1]['receiptNo'] != c['receiptNo']

    assert collect(client, chennai, s['id'], 1).status_code == 409  # paid in full
    assert collect(client, login(client, 'cochin'), s['id'], 1).status_code == 404  # another store's bill
    assert collect(client, admin, s['id'], 1).status_code == 403  # the admin doesn't collect

    # a refresh of the list picks up the bill whose balance changed, though it was made earlier
    since = (datetime.now(UTC) - timedelta(seconds=30)).isoformat()
    changed = client.get('/sales', params={'since': since}, headers=chennai).json()
    assert any(x['id'] == s['id'] and x['balance'] == 0 for x in changed)


def test_collections_count_in_the_days_cash(client):
    mumbai = login(client, 'mumbai')
    lines = [{'code': dear_code(client, mumbai), 'qty': 2}]
    total = payable_of(client, mumbai, lines)
    before = client.get('/cash/day', headers=mumbai).json()

    s = client.post('/sales', json=sale(lines, 'cash', received=300, later=total - 300), headers=mumbai).json()
    collect(client, mumbai, s['id'], 100, 'cash', received=500)  # ₹400 change: ₹100 into the drawer
    collect(client, mumbai, s['id'], 50, 'card')

    day = client.get('/cash/day', headers=mumbai).json()
    assert day['cashSales'] == before['cashSales'] + 300 + 100
    assert day['card'] == before['card'] + 50
    assert day['collected'] == before['collected'] + 150 and day['collections'] == before['collections'] + 2


def test_a_return_on_a_credit_bill_pays_off_the_balance_first(client):
    cochin = login(client, 'cochin')
    code = dear_code(client, cochin)
    lines = [{'code': code, 'qty': 2}]
    total = payable_of(client, cochin, lines)
    s = client.post('/sales', json=sale(lines, 'upi', received=0, later=total - 100), headers=cochin).json()
    owed = s['balance']

    r = client.post(
        '/returns',
        json={'id': str(uuid.uuid4()), 'saleId': s['id'], 'lines': [{'code': code, 'qty': 1}], 'reason': ''},
        headers=cochin,
    )
    assert r.status_code == 201, r.text
    note, original = r.json()['creditNote'], r.json()['original']
    off = min(note['amount'], owed)
    assert note['balanceOff'] == off and note['refund'] == note['amount'] - off
    assert original['id'] == s['id'] and original['balance'] == owed - off
    assert CUSTOMER['name'] == original['name']
