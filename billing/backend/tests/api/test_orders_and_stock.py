import uuid

from openpyxl import Workbook

from app import cli

from .conftest import login
from .test_sales import season_code, stock_of


def stock_admin(client, admin, code, qty):
    """Puts units into the admin's own stock, which purchase orders are sent out of."""
    body = {
        'id': str(uuid.uuid4()),
        'location': 'warehouse',
        'file': 'By hand',
        'source': 'manual',
        'lines': [{'code': code, 'qty': qty}],
    }
    assert client.post('/stock/imports', json=body, headers=admin).status_code == 201


def test_purchase_order_is_a_request(client, chennai, admin):
    code = season_code(client, chennai, 1)

    o = client.post('/orders', json={'lines': [{'code': code, 'qty': 5}], 'note': 'Low'}, headers=chennai)
    assert o.status_code == 201, o.text
    o = o.json()
    assert o['status'] == 'requested' and o['number'].startswith('PO-CHN-') and o['lines'][0]['name']
    assert o['history'][0]['action'] == 'requested' and o['history'][0]['by'] == 'Chennai'

    edited = client.put(f'/orders/{o["id"]}', json={'lines': [{'code': code, 'qty': 6}]}, headers=chennai).json()
    assert edited['lines'][0]['qty'] == 6 and edited['history'][-1]['action'] == 'updated'

    # the admin reviews it before raising the invoice: the lines change, the showroom's note stays
    other = season_code(client, chennai, 2)
    review = {'lines': [{'code': code, 'qty': 4}, {'code': other, 'qty': 2}], 'note': 'Only 4 left'}
    reviewed = client.put(f'/orders/{o["id"]}', json=review, headers=admin).json()
    assert [(line['code'], line['qty']) for line in reviewed['lines']] == [(code, 4), (other, 2)]
    assert reviewed['note'] == 'Low' and reviewed['status'] == 'requested'
    last = reviewed['history'][-1]
    assert (last['action'], last['by'], last['note']) == ('reviewed', 'Admin', 'Only 4 left')

    # the admin answers with a transfer invoice: no sending, no counting in, no ordering for a showroom
    send = {'lines': [{'code': code, 'qty': 6}]}
    assert client.post(f'/orders/{o["id"]}/send', json=send, headers=admin).status_code in (404, 405)
    assert client.post(f'/orders/{o["id"]}/receive', json={'counted': []}, headers=chennai).status_code in (404, 405)
    direct = {'lines': [{'code': code, 'qty': 1}], 'location': 'pune'}
    assert client.post('/orders', json=direct, headers=admin).status_code == 403


def test_reject_and_cancel(client, chennai, admin):
    code = season_code(client, chennai)
    body = {'lines': [{'code': code, 'qty': 1}]}
    a = client.post('/orders', json=body, headers=chennai).json()
    assert client.post(f'/orders/{a["id"]}/reject', json={'note': 'No'}, headers=admin).json()['status'] == 'rejected'
    b = client.post('/orders', json=body, headers=chennai).json()
    assert client.post(f'/orders/{b["id"]}/cancel', headers=admin).status_code == 403
    assert client.post(f'/orders/{b["id"]}/cancel', headers=chennai).json()['status'] == 'cancelled'
    assert client.post(f'/orders/{b["id"]}/reject', json={}, headers=admin).status_code == 409


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


def test_a_showroom_cannot_import_stock_except_its_own_products(client, chennai):
    code = season_code(client, chennai, 2)
    before = stock_of(client, chennai, 'chennai', code)
    body = {'id': str(uuid.uuid4()), 'file': 'x.xlsx', 'lines': [{'code': code, 'qty': 3}]}
    r = client.post('/stock/imports', json=body, headers=chennai)
    assert r.status_code == 403 and 'admin’s invoice' in r.json()['detail']
    manual = client.post('/stock/imports', json={**body, 'id': str(uuid.uuid4()), 'source': 'manual'}, headers=chennai)
    assert manual.status_code == 403
    assert stock_of(client, chennai, 'chennai', code) == before


def test_stock_goes_back_to_the_admin(client, admin):
    pune = login(client, 'pune')
    code = season_code(client, pune, 3)
    body = {'id': str(uuid.uuid4()), 'location': 'pune', 'file': 'x.xlsx', 'lines': [{'code': code, 'qty': 4}]}
    client.post('/stock/imports', json=body, headers=admin)
    before = stock_of(client, pune, 'pune', code)

    too_many = {'id': str(uuid.uuid4()), 'reason': 'end-of-season', 'lines': [{'code': code, 'qty': before + 1}]}
    assert client.post('/purchase-returns', json=too_many, headers=pune).status_code == 422
    assert (
        client.post(
            '/purchase-returns', json={**too_many, 'lines': [{'code': code, 'qty': 1}]}, headers=admin
        ).status_code
        == 403
    )

    r = client.post('/purchase-returns', json={**too_many, 'lines': [{'code': code, 'qty': 3}]}, headers=pune)
    assert r.status_code == 201, r.text
    r = r.json()
    assert r['status'] == 'sent' and r['number'].startswith('PR-PUN-')
    assert stock_of(client, pune, 'pune', code) == before - 3

    assert client.post(f'/purchase-returns/{r["id"]}/receive', json={'counted': []}, headers=pune).status_code == 403
    in_admin = stock_of(client, admin, 'warehouse', code)
    got = client.post(
        f'/purchase-returns/{r["id"]}/receive',
        json={'counted': [{'code': code, 'qty': 2}], 'note': '1 broken'},
        headers=admin,
    )
    assert got.json()['status'] == 'received' and got.json()['counted'] == [{'code': code, 'qty': 2}]
    assert stock_of(client, admin, 'warehouse', code) == in_admin + 2  # back in the admin's stock
    assert client.post(f'/purchase-returns/{r["id"]}/receive', json={'counted': []}, headers=admin).status_code == 409


def test_seed_adds_a_stock_sheet_to_the_admin_stock_once(client, admin, tmp_path):
    one, two = season_code(client, admin, 14), season_code(client, admin, 15)
    sheet = Workbook()
    sheet.active.append(['Code', 'Product name', 'Qty', 'Purchase rate'])
    sheet.active.append([one.lower(), 'x', 7, 100.5])
    sheet.active.append([two, 'y', 3, None])
    path = tmp_path / 'admin-stock-test.xlsx'
    sheet.save(path)
    before = {c: stock_of(client, admin, 'warehouse', c) for c in (one, two)}

    report = str(cli.seed(admin_stock=path))
    assert 'admin-stock-test.xlsx: 10 units added to the admin stock' in report
    assert {c: stock_of(client, admin, 'warehouse', c) for c in (one, two)} == {
        one: before[one] + 7,
        two: before[two] + 3,
    }
    imported = next(i for i in client.get('/stock/imports', headers=admin).json() if i['file'] == path.name)
    assert imported['location'] == 'warehouse'

    # run again (by mistake, or after a failed step): the same sheet adds nothing
    assert 'nothing was added' in str(cli.seed(admin_stock=path))
    assert stock_of(client, admin, 'warehouse', one) == before[one] + 7


def test_admin_stock(client, admin, chennai):
    code = season_code(client, admin, 4)
    # the admin adds any product to its own stock; a showroom can't touch it
    before = stock_of(client, admin, 'warehouse', code)
    stock_admin(client, admin, code, 5)
    assert stock_of(client, admin, 'warehouse', code) == before + 5
    body = {'id': str(uuid.uuid4()), 'location': 'warehouse', 'file': 'x', 'lines': [{'code': code, 'qty': 1}]}
    client.post('/stock/imports', json=body, headers=chennai)
    assert stock_of(client, admin, 'warehouse', code) == before + 5
    assert 'warehouse' not in client.get('/stock', headers=chennai).json()

    # the warehouse is not a showroom: no cash close, no shop products
    assert client.get('/cash/day?location=warehouse', headers=admin).status_code == 422
    new = {'location': 'warehouse', 'name': 'Thing', 'dept': 'Trees', 'mrp': 10}
    assert client.post('/products', json=new, headers=admin).status_code == 422
