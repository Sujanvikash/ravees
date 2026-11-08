import uuid

from .conftest import login
from .test_boxes import box
from .test_sales import season_code, stock_of


def product(client, headers, code):
    return next(p for p in client.get('/products', headers=headers).json()['products'] if p['code'] == code)


def enter(client, admin, boxes):
    r = client.post('/boxes', json={'boxes': boxes}, headers=admin)
    assert r.status_code == 200, r.text
    return r.json()


def invoice(client, admin, boxes, location='chennai', **extra):
    body = {'id': str(uuid.uuid4()), 'location': location, 'boxIds': [b['id'] for b in boxes], **extra}
    return client.post('/transfer-invoices', json=body, headers=admin)


def test_boxes_to_a_paid_invoice_to_the_store_stock(client, admin, chennai):
    code = season_code(client, chennai, 3)
    cost = product(client, admin, code)['cost']
    one, two = box('TI-1.A', [{'code': code, 'qty': 4}]), box('TI-1.B', [{'code': code, 'qty': 6}])
    enter(client, admin, [one, two])
    in_admin = stock_of(client, admin, 'warehouse', code)
    in_chennai = stock_of(client, chennai, 'chennai', code)

    r = invoice(client, admin, [one, two], note='Monday van')
    assert r.status_code == 201, r.text
    inv = r.json()
    assert inv['status'] == 'raised' and inv['number'].startswith('TI-ADM-') and inv['location'] == 'chennai'
    line = inv['lines'][0]
    assert line['qty'] == 10 and line['cost'] == cost and line['rate'] == round(cost * 1.18, 2)
    assert line['amount'] == round(line['rate'] * 10, 2) and inv['total'] == inv['subtotal'] == line['amount']
    assert inv['markupPct'] == 18 and set(inv['boxIds']) == {one['id'], two['id']}
    assert stock_of(client, admin, 'warehouse', code) == in_admin - 10  # out of the admin stock now
    assert stock_of(client, chennai, 'chennai', code) == in_chennai  # not in the store until stocked

    # sent twice: one invoice. The boxes are on it, so they can't be on another or deleted
    same = {'id': inv['id'], 'location': 'chennai', 'boxIds': [one['id']]}
    again = client.post('/transfer-invoices', json=same, headers=admin)
    assert again.status_code == 201 and again.json()['number'] == inv['number']
    assert invoice(client, admin, [one]).status_code == 409
    assert client.delete(f'/boxes/{one["id"]}', headers=admin).status_code == 409
    listed = {b['id']: b for b in client.get('/boxes', headers=admin).json()}
    assert listed[one['id']]['status'] == 'invoiced' and listed[one['id']]['location'] == 'chennai'
    assert listed[one['id']]['invoiceId'] == inv['id']

    # paying needs the e-way bill or bill number; adding to stock needs it paid
    url = f'/transfer-invoices/{inv["id"]}'
    assert client.post(f'{url}/pay', json={}, headers=admin).status_code == 422
    assert client.post(f'{url}/stock', headers=admin).status_code == 409
    docs = client.put(f'{url}/documents', json={'ewayNo': '271012345678', 'billNo': 'B/22'}, headers=admin)
    assert docs.status_code == 200 and docs.json()['ewayNo'] == '271012345678' and not docs.json()['hasDocument']
    assert client.get(f'{url}/document', headers=admin).status_code == 404
    pdf = client.put(
        f'{url}/documents',
        json={'ewayNo': '271012345678', 'docName': 'eway.pdf', 'docBase64': 'JVBERi0xLjQK'},
        headers=admin,
    )
    assert pdf.json()['hasDocument'] and pdf.json()['docName'] == 'eway.pdf'
    got = client.get(f'{url}/document', headers=admin)
    assert got.status_code == 200 and got.content == b'%PDF-1.4\n' and got.headers['content-type'] == 'application/pdf'
    assert client.put(f'{url}/documents', json={'docBase64': '!!!'}, headers=admin).status_code == 422

    paid = client.post(f'{url}/pay', json={'ref': 'NEFT 1'}, headers=admin)
    assert paid.status_code == 200 and paid.json()['status'] == 'paid' and paid.json()['paidRef'] == 'NEFT 1'
    assert client.post(f'{url}/pay', json={}, headers=admin).status_code == 409
    assert stock_of(client, chennai, 'chennai', code) == in_chennai

    done = client.post(f'{url}/stock', headers=admin)
    assert done.status_code == 200 and done.json()['status'] == 'stocked'
    assert stock_of(client, chennai, 'chennai', code) == in_chennai + 10
    assert client.post(f'{url}/stock', headers=admin).status_code == 409  # added once
    assert client.post(f'{url}/cancel', headers=admin).status_code == 409
    listed = {b['id']: b for b in client.get('/boxes', headers=admin).json()}
    assert listed[two['id']]['status'] == 'stocked'
    assert [h['action'] for h in done.json()['history']] == ['raised', 'documents', 'documents', 'paid', 'stocked']


def order_status(client, admin, order_id):
    return next(o for o in client.get('/orders', headers=admin).json() if o['id'] == order_id)['status']


def test_cancelling_gives_everything_back(client, admin, chennai):
    code = season_code(client, chennai, 4)
    one = box('TI-2.A', [{'code': code, 'qty': 5}])
    enter(client, admin, [one])
    in_admin = stock_of(client, admin, 'warehouse', code)
    order = client.post('/orders', json={'lines': [{'code': code, 'qty': 5}]}, headers=chennai).json()

    inv = invoice(client, admin, [one], orderId=order['id']).json()
    assert stock_of(client, admin, 'warehouse', code) == in_admin - 5
    assert order_status(client, admin, order['id']) == 'fulfilled'
    assert client.post(f'/orders/{order["id"]}/reject', json={}, headers=admin).status_code == 409

    cancelled = client.post(f'/transfer-invoices/{inv["id"]}/cancel', headers=admin)
    assert cancelled.status_code == 200 and cancelled.json()['status'] == 'cancelled'
    assert stock_of(client, admin, 'warehouse', code) == in_admin
    box_now = next(b for b in client.get('/boxes', headers=admin).json() if b['id'] == one['id'])
    assert box_now['status'] == 'in_stock' and box_now['location'] is None and box_now['invoiceId'] is None
    assert order_status(client, admin, order['id']) == 'requested'
    assert client.put(f'/transfer-invoices/{inv["id"]}/documents', json={}, headers=admin).status_code == 409
    assert invoice(client, admin, [one], location='mumbai').status_code == 201  # the box can be billed again


def test_what_an_invoice_refuses(client, admin, chennai):
    code = season_code(client, chennai, 5)
    one = box('TI-3.A', [{'code': code, 'qty': 2}])
    enter(client, admin, [one])
    assert invoice(client, admin, [one], location='warehouse').status_code == 422
    assert invoice(client, admin, [one], location='nowhere').status_code == 422
    assert invoice(client, admin, [{'id': str(uuid.uuid4())}]).status_code == 404
    other = client.post('/orders', json={'lines': [{'code': code, 'qty': 1}]}, headers=login(client, 'goa')).json()
    assert invoice(client, admin, [one], orderId=other['id']).status_code == 404  # another showroom's order
    assert invoice(client, admin, [one], orderId=str(uuid.uuid4())).status_code == 404


def test_a_showroom_cannot_work_invoices_only_read_its_own(client, admin, chennai):
    code = season_code(client, chennai, 6)
    one = box('TI-4.A', [{'code': code, 'qty': 1}])
    enter(client, admin, [one])
    inv = invoice(client, admin, [one], location='pune').json()
    assert invoice(client, chennai, [one]).status_code == 403
    for method, path, body in (
        ('put', 'documents', {'ewayNo': '1'}),
        ('post', 'pay', {}),
        ('post', 'stock', None),
        ('post', 'cancel', None),
        ('get', 'document', None),
    ):
        r = client.request(method, f'/transfer-invoices/{inv["id"]}/{path}', json=body, headers=chennai)
        assert r.status_code == 403, (path, r.status_code)
    assert inv['id'] not in {i['id'] for i in client.get('/transfer-invoices', headers=chennai).json()}
    pune = login(client, 'pune')
    assert inv['id'] in {i['id'] for i in client.get('/transfer-invoices', headers=pune).json()}
    assert inv['id'] in {i['id'] for i in client.get('/transfer-invoices?location=pune', headers=admin).json()}
