import uuid
from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy import text

from app import cli
from app.core import clock
from app.core.database import get_engine
from app.modules.demo.builder import SEED_KEY, build_demo, demo_is_current
from app.modules.quotes.service import last_valid_day

from .test_sales import CUSTOMER, season_code


def test_quotation(client, chennai, admin):
    code = season_code(client, chennai)
    body = {
        'id': str(uuid.uuid4()),
        'lines': [{'code': code, 'qty': 2}],
        **CUSTOMER,
        'validDays': 15,
        'note': ' Corporate ',
        'company': ' Raj  Hotels ',
        'address': '12 MG Road\n\n Goa ',
        'gstin': '33aaaaa0000a1z5',
        'deliveryDate': '2026-12-10',
    }
    q = client.post('/quotes', json=body, headers=chennai)
    assert q.status_code == 201, q.text
    q = q.json()
    assert (
        q['quoteNo'].startswith('QT-CHN')
        and '/' not in q['quoteNo']
        and q['by'] == 'Chennai'
        and q['note'] == 'Corporate'
    )
    assert q['company'] == 'Raj Hotels' and q['address'] == '12 MG Road\nGoa'
    assert q['gstin'] == '33AAAAA0000A1Z5' and q['deliveryDate'] == '2026-12-10'
    assert (
        client.post('/quotes', json={**body, 'id': str(uuid.uuid4()), 'gstin': '123'}, headers=chennai).status_code
        == 422
    )
    assert q['lines'][0]['qty'] == 2 and q['totals']['payable'] > 0
    assert client.post('/quotes', json=body, headers=chennai).json()['quoteNo'] == q['quoteNo']
    assert client.post('/quotes', json={**body, 'id': str(uuid.uuid4())}, headers=admin).status_code == 403
    assert client.post('/quotes', json={**body, 'validDays': 9}, headers=chennai).status_code == 422
    assert q['id'] in {x['id'] for x in client.get('/quotes', headers=admin).json()}

    # archiving (never deleting): not another showroom's, then by its own showroom — it is kept, archived
    from .conftest import login

    assert client.post(f'/quotes/{q["id"]}/archive', headers=login(client, 'goa')).status_code == 404
    archived = client.post(f'/quotes/{q["id"]}/archive', headers=chennai)
    assert archived.status_code == 200 and archived.json()['archivedAt']
    kept = {x['id']: x for x in client.get('/quotes', headers=admin).json()}
    assert q['id'] in kept and kept[q['id']]['archivedAt']  # still there, just archived
    # and it can be brought back
    assert client.post(f'/quotes/{q["id"]}/unarchive', headers=chennai).json()['archivedAt'] is None


def test_a_quotation_is_valid_until_a_date(client, chennai):
    today = clock.now().astimezone(clock.IST).date()
    body = {'lines': [{'code': season_code(client, chennai), 'qty': 1}], **CUSTOMER}

    def until(**extra):
        r = client.post('/quotes', json={**body, 'id': str(uuid.uuid4()), **extra}, headers=chennai)
        assert r.status_code == 201, r.text
        return datetime.fromisoformat(r.json()['validUntil']).astimezone(clock.IST)

    picked = today + timedelta(days=10)
    end = until(validUntil=picked.isoformat())
    assert end.date() == picked and end.time() == time(23, 59, 59)  # to the end of that day
    assert until(validDays=15).date() == today + timedelta(days=15)  # an older app's 7, 15 or 30 days
    for wrong in (today - timedelta(days=1), today + timedelta(days=367)):
        r = client.post(
            '/quotes', json={**body, 'id': str(uuid.uuid4()), 'validUntil': wrong.isoformat()}, headers=chennai
        )
        assert r.status_code == 422


def test_a_quotation_is_valid_until_christmas_unless_a_date_is_picked():
    def on(day):
        return datetime.combine(day, time(11, 0), clock.IST)

    assert last_valid_day(on(date(2026, 11, 10))) == date(2026, 12, 25)
    assert last_valid_day(on(date(2026, 12, 25))) == date(2026, 12, 25)
    assert last_valid_day(on(date(2026, 12, 26))) == date(2027, 1, 2)  # after Christmas: a week
    assert last_valid_day(on(date(2026, 11, 10)), date(2026, 11, 20)) == date(2026, 11, 20)


def test_settings(client, chennai, admin):
    s = client.get('/settings').json()  # open to the sign-in screen
    assert s['quotePrint'] is True and s['theme'] in {'classic', 'light', 'dark'}
    assert s['font'] in {'normal', 'large', 'larger'}
    # a showroom may change its own appearance, but not a business switch
    assert client.patch('/settings', json={'quotePrint': False}, headers=chennai).status_code == 403
    chennai_view = client.patch('/settings', json={'theme': 'dark', 'font': 'large'}, headers=chennai)
    assert (
        chennai_view.status_code == 200
        and chennai_view.json()['theme'] == 'dark'
        and chennai_view.json()['font'] == 'large'
    )
    # the showroom's own appearance doesn't change the admin's (global) view
    assert client.get('/settings', headers=admin).json()['theme'] == s['theme']
    assert client.get('/settings', headers=chennai).json()['theme'] == 'dark'
    client.patch('/settings', json={'theme': s['theme'], 'font': 'normal'}, headers=chennai)  # put it back

    # every store is a composition dealer by default
    assert s['composition'] is True
    # a showroom fills in its own bill details (store-level, not the admin's)
    shop = client.patch('/settings', json={'storeName': 'SPARKLE CHRISTMAS', 'composition': False}, headers=chennai)
    assert (
        shop.status_code == 200
        and shop.json()['storeName'] == 'SPARKLE CHRISTMAS'
        and shop.json()['composition'] is False
    )
    assert client.get('/settings', headers=admin).json()['storeName'] == ''  # the admin's own view is unaffected
    client.patch('/settings', json={'storeName': '', 'composition': True}, headers=chennai)

    assert client.patch('/settings', json={'theme': 'pink'}, headers=admin).status_code == 422
    assert client.patch('/settings', json={'nope': 1}, headers=admin).status_code == 422
    changed = client.patch('/settings', json={'theme': 'dark', 'quotePrint': False}, headers=admin).json()
    assert changed['theme'] == 'dark' and changed['quotePrint'] is False and changed['strip'] == s['strip']
    client.patch('/settings', json={'theme': s['theme'], 'quotePrint': True}, headers=admin)


def test_business_details_are_the_admins_alone(client, chennai, admin):
    mine = {
        'bizName': 'Raave Traders',
        'bizGstin': '33ABCDE1234F1Z5',
        'bankAccount': '123456789012',
    }
    assert client.patch('/settings', json=mine, headers=chennai).status_code == 403  # a showroom can't set them
    saved = client.patch('/settings', json=mine, headers=admin).json()
    try:
        assert saved['bizName'] == 'Raave Traders' and 'invoiceGst' not in saved  # an invoice always adds GST
        assert client.get('/settings', headers=admin).json()['bankAccount'] == '123456789012'
        # neither the sign-in screen nor a showroom ever sees them, not even in the answer to its own change
        for seen in (
            client.get('/settings').json(),
            client.get('/settings', headers=chennai).json(),
            client.patch('/settings', json={'font': 'normal'}, headers=chennai).json(),
        ):
            assert seen['bizName'] == seen['bizGstin'] == seen['bankAccount'] == ''
    finally:
        client.patch('/settings', json={'bizName': '', 'bizGstin': '', 'bankAccount': ''}, headers=admin)


@pytest.fixture(scope='module')
def demo_built():
    build_demo()


def demo(client, username):
    r = client.post('/auth/demo', json={'username': username})
    assert r.status_code == 200, r.text
    return r.json(), {'Authorization': f'Bearer {r.json()["token"]}'}


def test_demo_has_the_same_logins_on_its_own_data(client, demo_built):
    for username in ('chennai', 'bengaluru', 'goa', 'mumbai', 'pune', 'admin'):
        body, _ = demo(client, username)
        assert body['session']['demo'] is True and body['session']['username'] == username
    _, d_admin = demo(client, 'admin')
    assert client.get('/auth/me', headers=d_admin).json()['demo'] is True
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


def test_demo_discount_needs_no_password(client, demo_built):
    _, headers = demo(client, 'chennai')
    assert client.post('/auth/check-password', json={'password': ''}, headers=headers).status_code == 204


def test_refresh_demo_builds_only_a_demo_that_is_out_of_date(demo_built, capsys):
    assert demo_is_current()
    cli.refresh_demo()
    assert 'up to date' in capsys.readouterr().out

    # a deploy that adds a column leaves the demo schema behind: the next start builds it again
    with get_engine().begin() as conn:
        conn.execute(text('ALTER TABLE demo.products DROP COLUMN image'))
    assert not demo_is_current()
    cli.refresh_demo()
    assert 'building it' in capsys.readouterr().out
    assert demo_is_current()

    # so does a deploy that changes the product Excel the demo was built from
    with get_engine().begin() as conn:
        conn.execute(text(f"UPDATE demo.app_settings SET value = 'old' WHERE key = '{SEED_KEY}'"))
    assert not demo_is_current()
    cli.refresh_demo()
    assert 'building it' in capsys.readouterr().out
    assert demo_is_current()


def test_the_demo_starts_clean_with_the_2026_season(client, demo_built):
    _, d_admin = demo(client, 'admin')
    season = {p['code'] for p in client.get('/products', headers=d_admin).json()['products'] if p['inSeason']}
    assert len(season) == 477 and 'CT26020' in season and 'TR0232' not in season
    # the season's total quantities are in the admin stock, imported from the stock sheet
    stock = client.get('/stock', headers=d_admin).json()
    assert set(stock) == {'warehouse'} and set(stock['warehouse']) == season
    assert sum(stock['warehouse'].values()) == 166190 and stock['warehouse']['CT26020'] == 130
    assert [i['file'] for i in client.get('/stock/imports', headers=d_admin).json()] == ['admin-stock-2026.xlsx']
    # nothing else, as on the real side before its first day: every workflow is tried from its first step
    for path in ('/sales', '/returns', '/orders', '/quotes', '/cash/closes', '/boxes'):
        assert client.get(path, headers=d_admin).json() == [], path
    for path in ('/transfer-invoices', '/purchase-returns'):
        assert client.get(path, headers=d_admin).json() == [], path
