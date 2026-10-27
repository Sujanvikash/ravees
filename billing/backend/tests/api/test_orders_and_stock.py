import uuid

from .conftest import login
from .test_sales import season_code, stock_of


def test_purchase_order_flow(client, chennai, admin):
    code = season_code(client, chennai, 1)
    before = stock_of(client, chennai, 'chennai', code)

    o = client.post('/orders', json={'lines': [{'code': code, 'qty': 5}], 'note': 'Low'}, headers=chennai)
    assert o.status_code == 201, o.text
    o = o.json()
    assert o['status'] == 'requested' and o['number'].startswith('PO-CHN-') and o['lines'][0]['name']
    assert o['history'][0]['action'] == 'requested' and o['history'][0]['by'] == 'Chennai'

    edited = client.put(f'/orders/{o["id"]}', json={'lines': [{'code': code, 'qty': 6}]}, headers=chennai).json()
    assert edited['lines'][0]['qty'] == 6 and edited['history'][-1]['action'] == 'updated'

    # only the admin sends; the showroom can't count in a request
    assert (
        client.post(f'/orders/{o["id"]}/send', json={'lines': [{'code': code, 'qty': 6}]}, headers=chennai).status_code
        == 403
    )
    assert client.post(f'/orders/{o["id"]}/receive', json={'counted': []}, headers=chennai).status_code == 409
    sent = client.post(f'/orders/{o["id"]}/send', json={'lines': [{'code': code, 'qty': 8, 'rate': 10}]}, headers=admin)
    assert sent.json()['status'] == 'sent' and sent.json()['lines'][0]['rate'] == 10
    assert stock_of(client, chennai, 'chennai', code) == before  # not until it is counted in

    # another showroom can't see or count it
    goa = login(client, 'goa')
    assert client.post(f'/orders/{o["id"]}/receive', json={'counted': []}, headers=goa).status_code == 404
    r = client.post(
        f'/orders/{o["id"]}/receive', json={'counted': [{'code': code, 'qty': 7}], 'note': '1 short'}, headers=chennai
    )
    assert r.json()['status'] == 'received' and r.json()['counted'] == [{'code': code, 'qty': 7}]
    assert stock_of(client, chennai, 'chennai', code) == before + 7
    assert client.post(f'/orders/{o["id"]}/receive', json={'counted': []}, headers=chennai).status_code == 409


def test_reject_and_cancel(client, chennai, admin):
    code = season_code(client, chennai)
    body = {'lines': [{'code': code, 'qty': 1}]}
    a = client.post('/orders', json=body, headers=chennai).json()
    assert client.post(f'/orders/{a["id"]}/reject', json={'note': 'No'}, headers=admin).json()['status'] == 'rejected'
    b = client.post('/orders', json=body, headers=chennai).json()
    assert client.post(f'/orders/{b["id"]}/cancel', headers=admin).status_code == 403
    assert client.post(f'/orders/{b["id"]}/cancel', headers=chennai).json()['status'] == 'cancelled'
    assert client.post(f'/orders/{b["id"]}/reject', json={}, headers=admin).status_code == 409
    # an admin order goes straight out
    c = client.post('/orders', json={**body, 'location': 'pune'}, headers=admin).json()
    assert c['status'] == 'sent' and c['location'] == 'pune'


def test_stock_import(client, chennai, admin):
    code = season_code(client, chennai, 2)
    before = stock_of(client, admin, 'mumbai', code)
    body = {
        'id': str(uuid.uuid4()),
        'location': 'mumbai',
        'file': 'opening.xlsx',
        'lines': [{'code': code, 'qty': 3}, {'code': code, 'qty': 2}],
    }
    r = client.post('/stock/imports', json=body, headers=admin)
    assert r.status_code == 201, r.text
    assert r.json()['lines'][0]['qty'] == 5 and r.json()['by'] == 'Admin'
    client.post('/stock/imports', json=body, headers=admin)  # sent twice: added once
    assert stock_of(client, admin, 'mumbai', code) == before + 5
    assert (
        client.post(
            '/stock/imports', json={**body, 'id': str(uuid.uuid4()), 'location': None}, headers=admin
        ).status_code
        == 422
    )
    assert body['id'] in {x['id'] for x in client.get('/stock/imports', headers=admin).json()}


def test_stock_goes_back_to_the_admin(client, admin):
    pune = login(client, 'pune')
    code = season_code(client, pune, 3)
    client.post(
        '/stock/imports',
        json={'id': str(uuid.uuid4()), 'file': 'x.xlsx', 'lines': [{'code': code, 'qty': 4}]},
        headers=pune,
    )
    before = stock_of(client, pune, 'pune', code)

    too_many = {'id': str(uuid.uuid4()), 'reason': 'end-of-season', 'lines': [{'code': code, 'qty': before + 1}]}
    assert client.post('/stock-returns', json=too_many, headers=pune).status_code == 422
    assert (
        client.post('/stock-returns', json={**too_many, 'lines': [{'code': code, 'qty': 1}]}, headers=admin).status_code
        == 403
    )

    r = client.post('/stock-returns', json={**too_many, 'lines': [{'code': code, 'qty': 3}]}, headers=pune)
    assert r.status_code == 201, r.text
    r = r.json()
    assert r['status'] == 'sent' and r['number'].startswith('SR-PUN-')
    assert stock_of(client, pune, 'pune', code) == before - 3

    assert client.post(f'/stock-returns/{r["id"]}/receive', json={'counted': []}, headers=pune).status_code == 403
    got = client.post(
        f'/stock-returns/{r["id"]}/receive',
        json={'counted': [{'code': code, 'qty': 2}], 'note': '1 broken'},
        headers=admin,
    )
    assert got.json()['status'] == 'received' and got.json()['counted'] == [{'code': code, 'qty': 2}]
    assert client.post(f'/stock-returns/{r["id"]}/receive', json={'counted': []}, headers=admin).status_code == 409
