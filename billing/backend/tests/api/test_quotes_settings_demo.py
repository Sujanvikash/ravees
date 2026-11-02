import uuid

import pytest

from app.modules.demo.builder import build_demo

from .test_sales import CUSTOMER, season_code


def test_quotation(client, chennai, admin):
    code = season_code(client, chennai)
    body = {
        'id': str(uuid.uuid4()),
        'lines': [{'code': code, 'qty': 2}],
        **CUSTOMER,
        'validDays': 15,
        'note': ' Corporate ',
    }
    q = client.post('/quotes', json=body, headers=chennai)
    assert q.status_code == 201, q.text
    q = q.json()
    assert q['quoteNo'].startswith('QT-CHN/') and q['by'] == 'Chennai' and q['note'] == 'Corporate'
    assert q['lines'][0]['qty'] == 2 and q['totals']['payable'] > 0
    assert client.post('/quotes', json=body, headers=chennai).json()['quoteNo'] == q['quoteNo']
    assert client.post('/quotes', json={**body, 'id': str(uuid.uuid4())}, headers=admin).status_code == 403
    assert client.post('/quotes', json={**body, 'validDays': 9}, headers=chennai).status_code == 422
    assert q['id'] in {x['id'] for x in client.get('/quotes', headers=admin).json()}

    # deleting: not another showroom's, then by its own showroom
    from .conftest import login

    assert client.delete(f'/quotes/{q["id"]}', headers=login(client, 'goa')).status_code == 404
    assert client.delete(f'/quotes/{q["id"]}', headers=chennai).status_code == 204
    assert q['id'] not in {x['id'] for x in client.get('/quotes', headers=admin).json()}
    assert client.delete(f'/quotes/{q["id"]}', headers=admin).status_code == 404


def test_settings(client, chennai, admin):
    s = client.get('/settings').json()  # open to the sign-in screen
    assert s['quotePrint'] is True and s['theme'] in {'classic', 'light', 'dark'} and s['returnDays'] in {0, 7, 15, 30}
    assert s['font'] in {'normal', 'large', 'larger'}
    # a showroom may change its own appearance, but not a business switch
    assert client.patch('/settings', json={'quotePrint': False}, headers=chennai).status_code == 403
    chennai_view = client.patch('/settings', json={'theme': 'dark', 'font': 'large'}, headers=chennai)
    assert chennai_view.status_code == 200 and chennai_view.json()['theme'] == 'dark' and chennai_view.json()['font'] == 'large'
    # the showroom's own appearance doesn't change the admin's (global) view
    assert client.get('/settings', headers=admin).json()['theme'] == s['theme']
    assert client.get('/settings', headers=chennai).json()['theme'] == 'dark'
    client.patch('/settings', json={'theme': s['theme'], 'font': 'normal'}, headers=chennai)  # put it back

    # a showroom fills in its own bill details and the composition-dealer flag (store-level, not the admin's)
    shop = client.patch('/settings', json={'storeName': 'SPARKLE CHRISTMAS', 'composition': True}, headers=chennai)
    assert shop.status_code == 200 and shop.json()['storeName'] == 'SPARKLE CHRISTMAS' and shop.json()['composition'] is True
    assert client.get('/settings', headers=admin).json()['composition'] is False  # the admin's own view is unaffected
    client.patch('/settings', json={'storeName': '', 'composition': False}, headers=chennai)

    assert client.patch('/settings', json={'theme': 'pink'}, headers=admin).status_code == 422
    assert client.patch('/settings', json={'nope': 1}, headers=admin).status_code == 422
    changed = client.patch('/settings', json={'theme': 'dark', 'quotePrint': False}, headers=admin).json()
    assert changed['theme'] == 'dark' and changed['quotePrint'] is False and changed['nav'] == s['nav']
    client.patch('/settings', json={'theme': s['theme'], 'quotePrint': True}, headers=admin)


@pytest.fixture(scope='module')
def demo_built():
    build_demo()


def demo(client, username):
    r = client.post('/auth/demo', json={'username': username})
    assert r.status_code == 200, r.text
    return r.json(), {'Authorization': f'Bearer {r.json()["token"]}'}


def test_demo_has_the_same_logins_on_its_own_data(client, admin, demo_built):
    for username in ('chennai', 'bengaluru', 'goa', 'mumbai', 'pune', 'admin'):
        body, _ = demo(client, username)
        assert body['session']['demo'] is True and body['session']['username'] == username
    _, d_admin = demo(client, 'admin')
    assert client.get('/auth/me', headers=d_admin).json()['demo'] is True
    assert len(client.get('/sales', headers=d_admin).json()) > 300
    assert {o['status'] for o in client.get('/orders', headers=d_admin).json()} == {
        'requested', 'sent', 'received', 'rejected', 'cancelled'
    }  # fmt: skip
    assert client.get('/cash/closes', headers=d_admin).json()
    # the real data never sees the demo's bills
    real = {s['id'] for s in client.get('/sales', headers=admin).json()}
    assert not real & {s['id'] for s in client.get('/sales', headers=d_admin).json()}
    assert client.post('/auth/demo', json={'username': 'nobody'}).status_code == 404


def test_demo_work_stays_in_the_demo(client, chennai, demo_built):
    _, d_chennai = demo(client, 'chennai')
    code = season_code(client, d_chennai)
    before = len(client.get('/sales', headers=chennai).json())
    body = {'id': str(uuid.uuid4()), 'lines': [{'code': code, 'qty': 1}], **CUSTOMER, 'payment': {'method': 'upi'}}
    assert client.post('/sales', json=body, headers=d_chennai).status_code == 201
    assert len(client.get('/sales', headers=chennai).json()) == before

    _, d_admin = demo(client, 'admin')
    assert client.put('/users/goa/password', json={'password': 'secret99'}, headers=d_admin).status_code == 403
    assert client.post('/users/goa/password/reset', headers=d_admin).status_code == 403
    # a demo token is no good for the real sign-in's data, and the real admin can't reset the demo
    assert client.post('/demo/reset', headers=chennai).status_code == 403


def test_demo_reset(client, demo_built):
    _, d_admin = demo(client, 'admin')
    r = client.post('/demo/reset', headers=d_admin)
    assert r.status_code == 200 and 'Demo ready' in r.json()['detail']
    assert client.get('/auth/me', headers=d_admin).status_code == 200  # still signed in after the rebuild
