import json
import uuid
from datetime import datetime, time, timedelta
from io import BytesIO

import pytest
from openpyxl import load_workbook

from app.core import clock
from app.core.database import session_scope
from app.modules.cash import service as cash
from app.modules.cash.service import AUTO_KEY
from app.modules.sales.models import Sale
from app.modules.system import repository as system_repo

from .conftest import login
from .test_sales import sale, season_code, stock_of


def test_return_refunds_cash_and_restocks(client, chennai, admin):
    code = season_code(client, chennai)
    s = client.post('/sales', json=sale([{'code': code, 'qty': 3}]), headers=chennai).json()
    before = stock_of(client, chennai, 'chennai', code)

    found = client.get('/returns/bill', params={'bill_no': s['billNo'].lower()}, headers=chennai).json()
    assert found['lines'][0]['sold'] == 3 and found['lines'][0]['returned'] == 0

    r = client.post(
        '/returns',
        json={'id': str(uuid.uuid4()), 'saleId': s['id'], 'lines': [{'code': code, 'qty': 2}], 'reason': 'Too big'},
        headers=chennai,
    )
    assert r.status_code == 201, r.text
    cn = r.json()['creditNote']
    assert cn['returnNo'].startswith('CN-CHN') and '/' not in cn['returnNo'] and cn['kind'] == 'return' and cn['billNo'] == s['billNo']
    assert cn['refund'] == cn['amount'] == round(s['lines'][0]['price'] * 2)
    assert r.json()['sale'] is None
    assert stock_of(client, chennai, 'chennai', code) == before + 2

    # only one more can come back
    more = {'id': str(uuid.uuid4()), 'billNo': s['billNo'], 'lines': [{'code': code, 'qty': 2}]}
    assert (
        client.post('/returns', json=more, headers=chennai).json()['detail']
        == f'Only 1 of {code} can still come back on {s["billNo"]}.'
    )
    # another showroom, or the admin, can't take it
    assert (
        client.post(
            '/returns', json={**more, 'lines': [{'code': code, 'qty': 1}]}, headers=login(client, 'goa')
        ).status_code
        == 404
    )
    assert client.post('/returns', json=more, headers=admin).status_code == 403


def test_exchange_takes_the_value_off_the_new_bill(client, chennai):
    code = season_code(client, chennai)
    other = season_code(client, chennai, 1)
    s = client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=chennai).json()
    body = {
        'id': str(uuid.uuid4()),
        'saleId': s['id'],
        'lines': [{'code': code, 'qty': 1}],
        'exchange': {'id': str(uuid.uuid4()), 'lines': [{'code': other, 'qty': 3}], 'payment': {'method': 'upi'}},
    }
    r = client.post('/returns', json=body, headers=chennai).json()
    cn, new = r['creditNote'], r['sale']
    assert cn['kind'] == 'exchange' and cn['exchangeBillNo'] == new['billNo']
    credit = min(cn['amount'], new['totals']['payable'])
    assert new['payment']['credit'] == credit and new['payment']['creditNote'] == cn['returnNo']
    assert cn['refund'] == max(cn['amount'] - new['totals']['payable'], 0)
    if new['payment']['method'] == 'upi':
        assert new['payment']['received'] == new['totals']['payable'] - credit
    # sent again: nothing new
    assert client.post('/returns', json=body, headers=chennai).json()['creditNote']['returnNo'] == cn['returnNo']


def test_returns_have_no_time_window(client, chennai):
    # Returns are always allowed: an old sale can still be taken back (no return window).
    code = season_code(client, chennai)
    s = client.post('/sales', json=sale([{'code': code, 'qty': 1}]), headers=chennai).json()
    r = client.post(
        '/returns',
        json={'id': str(uuid.uuid4()), 'saleId': s['id'], 'lines': [{'code': code, 'qty': 1}]},
        headers=chennai,
    )
    assert r.status_code == 201


def test_cash_close(client, admin):
    mumbai = login(client, 'mumbai')
    code = season_code(client, mumbai)
    day = client.get('/cash/day', headers=mumbai).json()
    client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'cash', received=100000), headers=mumbai)
    after = client.get('/cash/day', headers=mumbai).json()
    assert after['bills'] == day['bills'] + 1 and after['cashSales'] > day['cashSales']

    expected = 500 + after['cashSales'] - after['cashRefunds']
    body = {'opening': 500, 'counted': expected - 50, 'floatNext': 1000, 'denominations': {'500': 2}, 'note': 'Short'}
    assert client.post('/cash/closes', json={**body, 'floatNext': expected + 1}, headers=mumbai).status_code == 422
    c = client.post('/cash/closes', json=body, headers=mumbai)
    assert c.status_code == 201, c.text
    assert c.json()['expected'] == expected and c.json()['difference'] == -50
    assert client.post('/cash/closes', json=body, headers=mumbai).status_code == 409
    assert client.post('/cash/closes', json=body, headers=admin).status_code == 403

    closes = client.get('/cash/closes', headers=admin).json()
    assert any(x['location'] == 'mumbai' and x['difference'] == -50 for x in closes)
    assert client.get('/cash/day?location=mumbai', headers=admin).json()['closed']['difference'] == -50


def test_cash_reopen(client):
    pune = login(client, 'pune')
    code = season_code(client, pune)
    client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'cash', received=100000), headers=pune)
    body = {'opening': 500, 'counted': 500, 'floatNext': 500, 'denominations': {}, 'note': ''}
    close_id = client.post('/cash/closes', json=body, headers=pune).json()['id']

    # a showroom can't reopen another showroom's close
    assert client.delete(f'/cash/closes/{close_id}', headers=login(client, 'bengaluru')).status_code == 403
    # reopening its own close opens the day again and drops the close
    r = client.delete(f'/cash/closes/{close_id}', headers=pune)
    assert r.status_code == 200, r.text
    assert r.json()['closed'] is None
    assert all(c['id'] != close_id for c in client.get('/cash/closes', headers=pune).json())
    # a reopened close is gone for good
    assert client.delete(f'/cash/closes/{close_id}', headers=pune).status_code == 422
    # so the day can be counted and closed again
    assert client.post('/cash/closes', json=body, headers=pune).status_code == 201


def test_cash_auto_close(client):
    goa = login(client, 'goa')
    code = season_code(client, goa)
    s = client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'cash', received=100000), headers=goa).json()

    today = cash.today()
    yesterday = today - timedelta(days=1)
    # move the bill to yesterday and arm the marker, as if goa billed yesterday and never closed
    with session_scope() as session:
        session.get(Sale, uuid.UUID(s['id'])).at = datetime.combine(yesterday, time(12, 0), clock.IST)
        marker = json.loads(system_repo.get_value(session, AUTO_KEY, '{}'))
        marker['goa'] = (today - timedelta(days=2)).isoformat()
        system_repo.set_value(session, AUTO_KEY, json.dumps(marker))

    # reading the cash closes the day that ended without a count
    closes = client.get('/cash/closes', headers=goa).json()
    auto = next(c for c in closes if c['location'] == 'goa' and c['day'] == yesterday.isoformat())
    assert auto['by'] == 'auto' and auto['difference'] == 0 and auto['counted'] == auto['expected']
    # today is never auto-closed, and reading again doesn't double up
    assert not any(c['location'] == 'goa' and c['day'] == today.isoformat() for c in closes)
    again = client.get('/cash/closes', headers=goa).json()
    assert sum(1 for c in again if c['location'] == 'goa' and c['day'] == yesterday.isoformat()) == 1


def test_sales_report_excel(client, admin, chennai):
    r = client.get('/reports/sales.xlsx', headers=admin)
    assert r.status_code == 200 and 'attachment' in r.headers['content-disposition']
    wb = load_workbook(BytesIO(r.content))
    assert wb.sheetnames == ['Summary', 'Bills', 'Items', 'Returns', 'Collections', 'Cash']
    assert 'Gross profit' in [c.value for c in wb['Summary'][1]]
    assert wb['Summary'].cell(row=wb['Summary'].max_row, column=1).value == 'All showrooms'

    mine = load_workbook(BytesIO(client.get('/reports/sales.xlsx', headers=chennai).content))
    assert 'Gross profit' not in [c.value for c in mine['Summary'][1]]
    assert {row[2] for row in mine['Bills'].iter_rows(min_row=2, values_only=True)} <= {'Chennai'}


def test_report_without_gst(client, admin):
    client.patch('/settings', json={'showGst': False}, headers=admin)
    try:
        wb = load_workbook(BytesIO(client.get('/reports/sales.xlsx', headers=admin).content))
        for sheet in ('Summary', 'Bills', 'Items'):
            header = [c.value for c in wb[sheet][1]]
            assert not {'GST', 'Taxable', 'GST %', 'Sales (incl. GST)'} & set(header), header
    finally:
        client.patch('/settings', json={'showGst': True}, headers=admin)


def test_final_sales_register(client, admin, chennai):
    assert client.get('/reports/final-sales.xlsx', headers=chennai).status_code == 403
    r = client.get('/reports/final-sales.xlsx', headers=admin)
    assert r.status_code == 200 and 'final-sales-all-showrooms' in r.headers['content-disposition']
    ws = load_workbook(BytesIO(r.content))['Final sales']
    header = [c.value for c in ws[1]]
    assert header[:3] == ['Bill no', 'Date', 'Showroom'] and header[-1] == 'Net amount'
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    amount, back, net = header.index('Amount'), header.index('Returns'), header.index('Net amount')
    bills = [row for row in rows if not str(row[0]).startswith('Total · ')]
    assert bills and all(row[net] == pytest.approx(row[amount] - row[back]) for row in bills)
    assert rows[-1][0] == 'Total · All showrooms'
    assert rows[-1][net] == pytest.approx(sum(row[net] for row in bills))

    one = load_workbook(BytesIO(client.get('/reports/final-sales.xlsx?location=chennai', headers=admin).content))
    rows = list(one['Final sales'].iter_rows(min_row=2, values_only=True))
    assert rows[-1][0] == 'Total · Chennai' and {row[2] for row in rows[:-1]} == {'Chennai'}
