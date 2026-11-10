import uuid

from .conftest import login
from .test_boxes import box
from .test_orders_and_stock import stock_admin
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
    assert inv['status'] == 'raised' and inv['number'].startswith('INV-ADM-') and inv['location'] == 'chennai'
    # billed at the cost price (D.Rate) with 18% GST on top, nothing else
    line = inv['lines'][0]
    assert line['qty'] == 10 and line['cost'] == line['rate'] == cost and line['amount'] == round(cost * 10, 2)
    assert line['gst'] == 18 and line['tax'] == round(line['amount'] * 0.18, 2)
    assert inv['subtotal'] == line['amount'] and inv['total'] == round(line['amount'] + line['tax'], 2)
    assert inv['markupPct'] == 0 and set(inv['boxIds']) == {one['id'], two['id']}
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

    # the e-way bill comes after payment; adding to stock needs it paid
    url = f'/transfer-invoices/{inv["id"]}'
    assert client.put(f'{url}/documents', json={'ewayNo': '271012345678'}, headers=admin).status_code == 409
    assert client.post(f'{url}/stock', headers=admin).status_code == 409
    paid = client.post(f'{url}/pay', json={'ref': 'NEFT 1'}, headers=admin)
    assert paid.status_code == 200 and paid.json()['status'] == 'paid' and paid.json()['paidRef'] == 'NEFT 1'
    assert client.post(f'{url}/pay', json={}, headers=admin).status_code == 409
    assert stock_of(client, chennai, 'chennai', code) == in_chennai

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

    done = client.post(f'{url}/stock', headers=admin)
    assert done.status_code == 200 and done.json()['status'] == 'stocked'
    assert stock_of(client, chennai, 'chennai', code) == in_chennai + 10
    assert client.post(f'{url}/stock', headers=admin).status_code == 409  # added once
    assert client.post(f'{url}/cancel', headers=admin).status_code == 409
    listed = {b['id']: b for b in client.get('/boxes', headers=admin).json()}
    assert listed[two['id']]['status'] == 'stocked'
    assert [h['action'] for h in done.json()['history']] == ['raised', 'paid', 'documents', 'documents', 'stocked']


def test_single_products_with_or_without_boxes(client, admin, chennai):
    code, other = season_code(client, chennai, 7), season_code(client, chennai, 8)
    stock_admin(client, admin, other, 5)
    stock_admin(client, admin, code, 1)  # a single one beside the box
    one = box('TI-5.A', [{'code': code, 'qty': 3}])
    enter(client, admin, [one])
    in_admin = {c: stock_of(client, admin, 'warehouse', c) for c in (code, other)}

    # single products only: no box needed (and no boxIds sent at all)
    body = {'id': str(uuid.uuid4()), 'location': 'chennai', 'lines': [{'code': other.lower(), 'qty': 2}]}
    r = client.post('/transfer-invoices', json=body, headers=admin)
    assert r.status_code == 201, r.text
    alone = r.json()
    assert alone['boxIds'] == [] and [(ln['code'], ln['qty']) for ln in alone['lines']] == [(other, 2)]
    assert stock_of(client, admin, 'warehouse', other) == in_admin[other] - 2

    # a box and single products together: the same product adds up to one line
    r = invoice(client, admin, [one], lines=[{'code': code, 'qty': 1}, {'code': other, 'qty': 1}])
    assert r.status_code == 201, r.text
    both = {ln['code']: ln['qty'] for ln in r.json()['lines']}
    assert both == {code: 4, other: 1} and r.json()['boxIds'] == [one['id']]
    assert stock_of(client, admin, 'warehouse', code) == in_admin[code] - 4

    # cancelling puts the single products back too
    client.post(f'/transfer-invoices/{r.json()["id"]}/cancel', headers=admin)
    assert stock_of(client, admin, 'warehouse', code) == in_admin[code]
    assert stock_of(client, admin, 'warehouse', other) == in_admin[other] - 2


def test_what_single_products_refuse(client, admin):
    nothing = client.post('/transfer-invoices', json={'id': str(uuid.uuid4()), 'location': 'chennai'}, headers=admin)
    assert nothing.status_code == 422 and 'Scan a box or a product' in nothing.json()['detail']
    unknown = invoice(client, admin, [], lines=[{'code': 'NOPE1', 'qty': 1}])
    assert unknown.status_code == 422 and 'NOPE1' in unknown.json()['detail']
    code = season_code(client, admin, 9)
    have = stock_of(client, admin, 'warehouse', code)
    short = invoice(client, admin, [], lines=[{'code': code, 'qty': have + 1}])
    assert short.status_code == 422 and 'Not enough in the admin stock' in short.json()['detail']


def test_the_store_on_the_invoice_and_the_place_of_supply(client, admin, chennai):
    code = season_code(client, chennai, 10)
    stock_admin(client, admin, code, 6)
    single = [{'code': code, 'qty': 1}]

    # left out, the store's own details are used; Chennai is in Tamil Nadu like the admin: CGST + SGST
    home = invoice(client, admin, [], lines=single).json()
    assert home['buyer']['state'] == '33' and home['buyer']['name'] and home['interState'] is False
    # Bengaluru is another state: IGST
    away = invoice(client, admin, [], location='bengaluru', lines=single).json()
    assert away['buyer']['state'] == '29' and away['interState'] is True

    # the details as entered on the invoice, e.g. the store's business name
    spark = {'name': 'Spark  Christmas', 'address': 'Indiranagar', 'gstin': '29abcde1234f1z5', 'state': '29'}
    r = invoice(client, admin, [], location='bengaluru', lines=single, buyer=spark)
    assert r.status_code == 201, r.text
    assert r.json()['buyer'] == {
        'name': 'Spark Christmas',
        'address': 'Indiranagar',
        'phone': '',
        'gstin': '29ABCDE1234F1Z5',
        'state': '29',
    }
    # a GSTIN from another state than the one chosen is refused
    wrong = invoice(client, admin, [], location='bengaluru', lines=single, buyer={**spark, 'state': '33'})
    assert wrong.status_code == 422 and 'state code 29' in wrong.json()['detail']


def test_editing_an_invoice_before_it_is_paid(client, admin, chennai):
    code, other = season_code(client, chennai, 11), season_code(client, chennai, 12)
    stock_admin(client, admin, other, 4)
    one, two = box('TI-6.A', [{'code': code, 'qty': 3}]), box('TI-6.B', [{'code': code, 'qty': 2}])
    enter(client, admin, [one, two])
    in_admin = {c: stock_of(client, admin, 'warehouse', c) for c in (code, other)}
    inv = invoice(client, admin, [one]).json()
    assert stock_of(client, admin, 'warehouse', code) == in_admin[code] - 3

    # swap box A for box B, add single products, and move it to Goa under another name
    url = f'/transfer-invoices/{inv["id"]}'
    change = {
        'location': 'goa',
        'boxIds': [two['id']],
        'lines': [{'code': other, 'qty': 4}],
        'buyer': {'name': 'Goa Xmas House', 'state': '30'},
        'note': 'changed',
    }
    r = client.put(url, json=change, headers=admin)
    assert r.status_code == 200, r.text
    edited = r.json()
    assert edited['number'] == inv['number'] and edited['location'] == 'goa' and edited['interState'] is True
    assert {ln['code']: ln['qty'] for ln in edited['lines']} == {code: 2, other: 4} and edited['boxIds'] == [two['id']]
    assert edited['buyer']['name'] == 'Goa Xmas House' and edited['note'] == 'changed'
    assert edited['history'][-1]['action'] == 'edited'
    # the admin stock and the boxes change by the difference
    assert stock_of(client, admin, 'warehouse', code) == in_admin[code] - 2
    assert stock_of(client, admin, 'warehouse', other) == in_admin[other] - 4
    boxes = {b['id']: b for b in client.get('/boxes', headers=admin).json()}
    assert boxes[one['id']]['status'] == 'in_stock' and boxes[one['id']]['invoiceId'] is None
    assert boxes[two['id']]['status'] == 'invoiced' and boxes[two['id']]['location'] == 'goa'

    # more than the admin holds is refused, and nothing changes
    too_many = {**change, 'lines': [{'code': other, 'qty': in_admin[other] + 1}]}
    assert client.put(url, json=too_many, headers=admin).status_code == 422
    assert stock_of(client, admin, 'warehouse', other) == in_admin[other] - 4

    # once paid it can't be edited
    client.post(f'{url}/pay', json={}, headers=admin)
    assert client.put(url, json=change, headers=admin).status_code == 409


def test_an_invoice_for_an_order_keeps_its_store(client, admin, chennai):
    code = season_code(client, chennai, 13)
    stock_admin(client, admin, code, 2)
    order = client.post('/orders', json={'lines': [{'code': code, 'qty': 2}]}, headers=chennai).json()
    inv = invoice(client, admin, [], lines=[{'code': code, 'qty': 2}], orderId=order['id']).json()
    url = f'/transfer-invoices/{inv["id"]}'
    moved = client.put(url, json={'location': 'pune', 'lines': [{'code': code, 'qty': 2}]}, headers=admin)
    assert moved.status_code == 422 and 'purchase order' in moved.json()['detail']
    same = client.put(url, json={'location': 'chennai', 'lines': [{'code': code, 'qty': 1}]}, headers=admin)
    assert same.status_code == 200 and same.json()['lines'][0]['qty'] == 1
    assert (
        client.put(url, json={'location': 'chennai', 'lines': [{'code': code, 'qty': 1}]}, headers=chennai).status_code
        == 403
    )


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
