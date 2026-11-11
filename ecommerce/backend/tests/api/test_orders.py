import hashlib
import hmac
import json
import uuid

import pytest

from app.modules.mail import service as mail

from .conftest import category, product, signup

ADDRESS = {
    'name': 'Asha Mathew',
    'phone': '98400 12345',
    'email': 'asha@example.com',
    'line1': '12 Casa Major Road',
    'line2': 'Egmore',
    'city': 'Chennai',
    'state': 'Tamil Nadu',
    'pincode': '600 008',
}


def _sign(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


@pytest.fixture
def stock(client, admin) -> dict:
    """A category with a 1,200 rupee product, a price-on-request one and a hidden one; delivery 150, free from 5,000."""
    group = category(client, admin)
    client.patch('/admin/settings', json={'deliveryFee': 150, 'freeDeliveryOver': 5000}, headers=admin)
    return {
        'priced': product(client, admin, group['id'], name='Gold baubles', price=1200, mrp=1500),
        'on_request': product(client, admin, group['id'], name='Grand tree'),
        'hidden': product(client, admin, group['id'], name='Old stock', price=100, visible=False),
    }


def _checkout(client, headers, lines, order_id=None):
    body = {'id': str(order_id or uuid.uuid4()), 'lines': lines, 'address': ADDRESS, 'notes': 'Ring the bell'}
    return client.post('/orders', json=body, headers=headers)


def test_checkout_and_paying(client, admin, stock):
    headers, customer = signup(client)
    priced = stock['priced']['id']
    assert _checkout(client, None, [{'productId': priced, 'qty': 1}]).status_code == 401

    r = _checkout(client, headers, [{'productId': priced, 'qty': 2}, {'productId': priced, 'qty': 1}])
    assert r.status_code == 201, r.text
    order, payment = r.json()['order'], r.json()['payment']
    # priced by the server: 3 x 1,200 = 3,600, under 5,000 so delivery is 150
    assert order['number'].startswith('RE-') and order['status'] == 'pending'
    assert order['lines'] == [
        {'productId': priced, 'name': 'Gold baubles', 'image': None, 'price': 1200.0, 'qty': 3, 'amount': 3600.0}
    ]
    assert (order['subtotal'], order['delivery'], order['total']) == (3600, 150, 3750)
    assert order['address']['pincode'] == '600008' and order['customer']['email'] == customer['email']
    assert payment['keyId'] == 'rzp_test_key' and payment['amount'] == 375000 and payment['currency'] == 'INR'
    assert payment['razorpayOrderId'].startswith('order_') and payment['prefill']['contact'] == '98400 12345'

    # the same checkout again (a retry) is the same order and the same Razorpay order
    again = _checkout(client, headers, [{'productId': priced, 'qty': 3}], order['id']).json()
    assert (
        again['order']['number'] == order['number']
        and again['payment']['razorpayOrderId'] == payment['razorpayOrderId']
    )
    # the cart grew before paying: the order follows, with a new Razorpay order for the new amount (free delivery)
    grown = _checkout(client, headers, [{'productId': priced, 'qty': 5}], order['id']).json()
    assert grown['order']['total'] == 6000 and grown['order']['delivery'] == 0
    assert grown['payment']['razorpayOrderId'] != payment['razorpayOrderId']
    payment = grown['payment']

    # a payment is only believed with Razorpay's signature
    url = f'/orders/{order["id"]}/verify'
    forged = {'razorpayOrderId': payment['razorpayOrderId'], 'razorpayPaymentId': 'pay_1', 'razorpaySignature': 'x'}
    assert client.post(url, json=forged, headers=headers).status_code == 422
    signature = _sign('razorpay-test-secret', f'{payment["razorpayOrderId"]}|pay_1'.encode())
    paid = client.post(url, json={**forged, 'razorpaySignature': signature}, headers=headers)
    assert paid.status_code == 200 and paid.json()['status'] == 'paid' and paid.json()['paidAt']
    to = {e.to for e in mail.OUTBOX}
    assert to == {customer['email'], 'orders@shop.test'} and 'confirmed' in mail.OUTBOX[0].subject
    assert client.post(url, json={**forged, 'razorpaySignature': signature}, headers=headers).json()['status'] == 'paid'
    assert len(mail.OUTBOX) == 2  # once

    # a paid checkout sent again has nothing more to pay
    assert _checkout(client, headers, [{'productId': priced, 'qty': 1}], order['id']).json()['payment'] is None

    mine = client.get('/orders', headers=headers).json()
    assert [o['number'] for o in mine] == [order['number']]
    other, _ = signup(client)
    assert client.get(f'/orders/{order["id"]}', headers=other).status_code == 404
    assert _checkout(client, other, [{'productId': priced, 'qty': 1}], order['id']).status_code == 409


def test_what_cannot_be_bought_online(client, admin, stock):
    headers, _ = signup(client)
    for key in ('on_request', 'hidden'):
        r = _checkout(client, headers, [{'productId': stock[key]['id'], 'qty': 1}])
        assert r.status_code == 422, key
    assert 'no online price' in _checkout(client, headers, [{'productId': stock['on_request']['id'], 'qty': 1}]).text
    client.patch(f'/admin/products/{stock["priced"]["id"]}', json={'inStock': False}, headers=admin)
    assert 'out of stock' in _checkout(client, headers, [{'productId': stock['priced']['id'], 'qty': 1}]).text
    assert _checkout(client, headers, [{'productId': 'no-such-thing', 'qty': 1}]).status_code == 422
    bad_pin = {
        'id': str(uuid.uuid4()),
        'lines': [{'productId': stock['priced']['id'], 'qty': 1}],
        'address': {**ADDRESS, 'pincode': '12'},
    }
    assert client.post('/orders', json=bad_pin, headers=headers).status_code == 422


def test_the_webhook_marks_an_order_paid(client, stock):
    headers, customer = signup(client)
    started = _checkout(client, headers, [{'productId': stock['priced']['id'], 'qty': 1}]).json()
    event = {
        'event': 'payment.captured',
        'payload': {
            'payment': {
                'entity': {'id': 'pay_hook', 'order_id': started['payment']['razorpayOrderId'], 'amount': 135000}
            }
        },
    }
    body = json.dumps(event).encode()
    url = '/payments/razorpay/webhook'
    assert client.post(url, content=body, headers={'X-Razorpay-Signature': 'forged'}).status_code == 422
    r = client.post(url, content=body, headers={'X-Razorpay-Signature': _sign('razorpay-webhook-secret', body)})
    assert r.status_code == 200
    order = client.get(f'/orders/{started["order"]["id"]}', headers=headers).json()
    assert order['status'] == 'paid' and order['razorpayPaymentId'] == 'pay_hook'
    assert customer['email'] in {e.to for e in mail.OUTBOX}
    # the browser's confirmation coming after it changes nothing
    signature = _sign('razorpay-test-secret', f'{started["payment"]["razorpayOrderId"]}|pay_hook'.encode())
    verify = {
        'razorpayOrderId': started['payment']['razorpayOrderId'],
        'razorpayPaymentId': 'pay_hook',
        'razorpaySignature': signature,
    }
    assert client.post(f'/orders/{order["id"]}/verify', json=verify, headers=headers).json()['status'] == 'paid'


def test_the_admin_moves_orders_along(client, admin, stock):
    headers, customer = signup(client)
    started = _checkout(client, headers, [{'productId': stock['priced']['id'], 'qty': 1}]).json()
    url = f'/admin/orders/{started["order"]["id"]}'
    assert client.patch(url, json={'status': 'shipped'}, headers=admin).status_code == 409  # not paid yet
    assert (
        client.patch(url, json={'status': 'paid', 'note': 'Paid by bank transfer'}, headers=admin).json()['status']
        == 'paid'
    )
    mail.OUTBOX.clear()
    shipped = client.patch(url, json={'status': 'shipped', 'note': 'DTDC 1234567'}, headers=admin).json()
    assert shipped['status'] == 'shipped' and shipped['history'][-1]['note'] == 'DTDC 1234567'
    [email] = mail.OUTBOX
    assert email.to == customer['email'] and 'DTDC 1234567' in email.text
    assert client.patch(url, json={'status': 'shipped'}, headers=admin).status_code == 422  # nothing new
    assert client.patch(url, json={'status': 'delivered'}, headers=admin).json()['status'] == 'delivered'
    assert client.patch(url, json={'status': 'cancelled'}, headers=admin).status_code == 409
    assert client.patch(url, json={'status': 'delivered'}, headers=headers).status_code == 401

    listed = {o['id']: o for o in client.get('/admin/orders', headers=admin).json()}
    assert listed[started['order']['id']]['customer']['email'] == customer['email']
    who = {c['email']: c for c in client.get('/admin/customers', headers=admin).json()}
    assert who[customer['email']]['orders'] == 1 and who[customer['email']]['spent'] == 1350
