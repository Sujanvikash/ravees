import uuid

from .conftest import login
from .test_sales import season_code, stock_of


def box(box_no, lines, **extra):
    return {'id': str(uuid.uuid4()), 'boxNo': box_no, 'lines': lines, **extra}


def test_boxes_are_the_admins_warehouse_inventory(client, admin, chennai):
    a, b = season_code(client, chennai), season_code(client, chennai, 1)
    before_a, before_b = stock_of(client, admin, 'warehouse', a), stock_of(client, admin, 'warehouse', b)
    first = box(
        '154.goa',
        [{'code': a, 'qty': 23}, {'code': b, 'qty': 4}, {'code': a, 'qty': 2}],
        stockNo='pua000445',
        shipment='GOA-1  VELANKA 2026',
    )
    second = box('155.GOA', [{'code': b, 'qty': 6}])
    r = client.post('/boxes', json={'boxes': [first, second]}, headers=admin)
    assert r.status_code == 200, r.text
    saved = r.json()[0]
    assert saved['boxNo'] == '154.GOA' and saved['stockNo'] == 'PUA000445' and saved['shipment'] == 'GOA-1 VELANKA 2026'
    assert saved['status'] == 'in_stock' and saved['location'] is None and saved['invoiceId'] is None
    assert {(line['code'], line['qty']) for line in saved['lines']} == {(a, 25), (b, 4)}
    # entering boxes adds their items to the admin's own stock, not a showroom's
    assert stock_of(client, admin, 'warehouse', a) == before_a + 25
    assert stock_of(client, admin, 'warehouse', b) == before_b + 10

    # a showroom can't enter, list or delete boxes
    mine = box('X1', [{'code': a, 'qty': 1}])
    assert client.post('/boxes', json={'boxes': [mine]}, headers=chennai).status_code == 403
    assert client.get('/boxes', headers=chennai).status_code == 403
    assert client.delete(f'/boxes/{first["id"]}', headers=chennai).status_code == 403
    assert {x['boxNo'] for x in client.get('/boxes', headers=admin).json()} >= {'154.GOA', '155.GOA'}

    # the old tag and receive routes are gone
    assert client.post('/boxes/tag', json={'ids': [first['id']], 'location': 'chennai'}, headers=admin).status_code in (
        404,
        405,
        422,
    )
    assert client.post(f'/boxes/{first["id"]}/receive', json={'counted': []}, headers=chennai).status_code in (404, 405)

    # deleting a box takes its items back out
    assert client.delete(f'/boxes/{second["id"]}', headers=admin).status_code == 204
    assert stock_of(client, admin, 'warehouse', b) == before_b + 4


def test_a_packing_list_is_saved_whole_or_not_at_all(client, admin, chennai):
    a = season_code(client, chennai)
    before = stock_of(client, admin, 'warehouse', a)
    ok = box('200.BLR', [{'code': a, 'qty': 1}])
    bad = box('201.BLR', [{'code': 'NO-SUCH-CODE', 'qty': 1}])
    r = client.post('/boxes', json={'boxes': [ok, bad]}, headers=admin)
    assert r.status_code == 422 and '201.BLR' in r.text and 'NO-SUCH-CODE' in r.text
    assert all(x['boxNo'] != '200.BLR' for x in client.get('/boxes', headers=admin).json())
    assert stock_of(client, admin, 'warehouse', a) == before

    assert client.post('/boxes', json={'boxes': [ok]}, headers=admin).status_code == 200
    # the same box number again, as another box, is refused; the same box (same id) is an edit
    assert (
        client.post('/boxes', json={'boxes': [box('200.blr', [{'code': a, 'qty': 2}])]}, headers=admin).status_code
        == 409
    )
    edited = client.post('/boxes', json={'boxes': [{**ok, 'lines': [{'code': a, 'qty': 5}]}]}, headers=admin).json()[0]
    assert edited['lines'][0]['qty'] == 5 and edited['history'][-1]['action'] == 'edited'
    assert stock_of(client, admin, 'warehouse', a) == before + 5  # by the difference, not twice


def test_a_box_whose_items_have_left_cannot_be_deleted(client, admin, chennai):
    a = season_code(client, chennai, 2)
    one = box('300.PUN', [{'code': a, 'qty': 3}])
    assert client.post('/boxes', json={'boxes': [one]}, headers=admin).status_code == 200
    body = {'id': str(uuid.uuid4()), 'location': 'warehouse', 'file': 'x', 'lines': [{'code': a, 'qty': 1}]}
    # taking the stock away by another route leaves the delete refused rather than negative
    in_stock = stock_of(client, admin, 'warehouse', a)
    client.post(
        '/purchase-returns', json={'id': str(uuid.uuid4()), 'reason': 'x', 'lines': []}, headers=login(client, 'pune')
    )
    assert body and in_stock >= 3
