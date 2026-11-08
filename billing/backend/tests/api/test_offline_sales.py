from datetime import UTC, datetime, timedelta

from app.core.clock import financial_year

from .conftest import login
from .test_sales import sale, season_code, stock_of


def offline_no(counter, seq, at=None, prefix='CHN'):
    year = financial_year(at or datetime.now(UTC)).replace('-', '')
    return f'{prefix}{year}OF{counter:02d}{seq:04d}'


def offline(body, bill_no, at=None):
    return {**body, 'offline': {'billNo': bill_no, 'at': (at or datetime.now(UTC)).isoformat()}}


def new_counter(client, headers):
    r = client.post('/sales/offline-counter', headers=headers)
    assert r.status_code == 201, r.text
    return r.json()['counter']


def test_each_browser_gets_its_own_offline_counter(client, chennai, admin):
    first = new_counter(client, chennai)
    assert new_counter(client, chennai) == first + 1
    assert client.post('/sales/offline-counter', headers=admin).status_code == 403


def test_an_offline_bill_keeps_its_number_and_time_and_comes_off_stock(client, chennai):
    counter = new_counter(client, chennai)
    code = season_code(client, chennai)
    before = stock_of(client, chennai, 'chennai', code)
    at = datetime.now(UTC) - timedelta(hours=2)
    body = offline(sale([{'code': code, 'qty': 2}]), offline_no(counter, 1, at), at)

    r = client.post('/sales', json=body, headers=chennai)
    assert r.status_code == 201, r.text
    s = r.json()
    assert s['billNo'] == offline_no(counter, 1, at)
    assert datetime.fromisoformat(s['at']) == at
    assert stock_of(client, chennai, 'chennai', code) == before - 2

    # sent again when the sync is retried: saved once
    again = client.post('/sales', json=body, headers=chennai).json()
    assert again['id'] == s['id'] and stock_of(client, chennai, 'chennai', code) == before - 2

    # the online series carries on as before
    nxt = client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=chennai).json()
    assert 'OF' not in nxt['billNo']


def test_offline_numbers_must_be_ones_the_showroom_was_given(client, chennai):
    counter = new_counter(client, chennai)
    code = season_code(client, chennai)

    def status(bill_no):
        return client.post('/sales', json=offline(sale([{'code': code, 'qty': 1}]), bill_no), headers=chennai)

    assert status(offline_no(counter, 1, prefix='GOA')).status_code == 422  # another showroom's
    assert status(offline_no(99, 1)).status_code == 422  # a counter never handed out
    assert status(offline_no(counter, 0)).status_code == 422
    assert status(f'CHN2627{counter:02d}0001').status_code == 422  # no OF

    assert status(offline_no(counter, 7)).status_code == 201
    taken = status(offline_no(counter, 7))  # a different bill with the same number
    assert taken.status_code == 409, taken.text

    goa = login(client, 'goa')
    r = client.post('/sales', json=offline(sale([{'code': code, 'qty': 1}]), offline_no(counter, 8)), headers=goa)
    assert r.status_code == 422


def test_an_offline_bill_is_recorded_as_it_was_paid(client, chennai):
    counter = new_counter(client, chennai)
    code = season_code(client, chennai)
    # a price went up on the server after the counter loaded the catalogue: the cash handed over is short
    body = offline(sale([{'code': code, 'qty': 1}], 'cash', received=1), offline_no(counter, 1))
    r = client.post('/sales', json=body, headers=chennai)
    assert r.status_code == 201, r.text
    assert r.json()['payment']['received'] == 1 and r.json()['payment']['change'] == 0

    split = offline(sale([{'code': code, 'qty': 1}], 'split', split={'cash': 1, 'upi': 1}), offline_no(counter, 2))
    r = client.post('/sales', json=split, headers=chennai)
    assert r.status_code == 201, r.text
    paid = r.json()['payment']['split']
    assert paid['cash'] + paid['upi'] + paid['card'] == r.json()['totals']['payable']

    # a counter clock running fast doesn't put the bill in the future
    ahead = datetime.now(UTC) + timedelta(minutes=10)
    r = client.post(
        '/sales', json=offline(sale([{'code': code, 'qty': 1}]), offline_no(counter, 3), ahead), headers=chennai
    )
    assert r.status_code == 201, r.text
    assert datetime.fromisoformat(r.json()['at']) < ahead


def test_an_offline_bill_needs_a_time_zone(client, chennai):
    counter = new_counter(client, chennai)
    code = season_code(client, chennai)
    body = sale([{'code': code, 'qty': 1}])
    body['offline'] = {'billNo': offline_no(counter, 1), 'at': '2026-11-08T10:00:00'}
    assert client.post('/sales', json=body, headers=chennai).status_code == 422
