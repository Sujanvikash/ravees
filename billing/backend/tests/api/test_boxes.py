import uuid

from .conftest import login
from .test_sales import season_code, stock_of


def box(box_no, lines, location=None, **extra):
    return {'id': str(uuid.uuid4()), 'boxNo': box_no, 'lines': lines, 'location': location, **extra}


def test_a_box_is_entered_tagged_and_counted_in_at_its_showroom(client, admin, chennai):
    a, b = season_code(client, chennai), season_code(client, chennai, 1)
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
    assert saved['status'] == 'packed' and saved['location'] is None
    assert {(line['code'], line['qty']) for line in saved['lines']} == {(a, 25), (b, 4)}

    # a showroom can't enter boxes, and sees none until one is tagged for it
    assert (
        client.post('/boxes', json={'boxes': [box('X1', [{'code': a, 'qty': 1}])]}, headers=chennai).status_code == 403
    )
    assert client.get('/boxes', headers=chennai).json() == []
    tagged = client.post('/boxes/tag', json={'ids': [first['id'], second['id']], 'location': 'chennai'}, headers=admin)
    assert tagged.status_code == 200 and {t['location'] for t in tagged.json()} == {'chennai'}
    assert {x['boxNo'] for x in client.get('/boxes', headers=chennai).json()} == {'154.GOA', '155.GOA'}

    # another showroom can't count it in
    mumbai = login(client, 'mumbai')
    counted = {'counted': [{'code': a, 'qty': 25}, {'code': b, 'qty': 3}], 'note': 'one short'}
    assert client.post(f'/boxes/{first["id"]}/receive', json=counted, headers=mumbai).status_code == 404

    before_a, before_b = stock_of(client, chennai, 'chennai', a), stock_of(client, chennai, 'chennai', b)
    got = client.post(f'/boxes/{first["id"]}/receive', json=counted, headers=chennai)
    assert got.status_code == 200 and got.json()['status'] == 'received'
    assert stock_of(client, chennai, 'chennai', a) == before_a + 25
    assert stock_of(client, chennai, 'chennai', b) == before_b + 3
    assert client.post(f'/boxes/{first["id"]}/receive', json=counted, headers=chennai).status_code == 409

    # a received box can't be edited, re-tagged or deleted; a packed one can be deleted
    assert client.post('/boxes', json={'boxes': [first]}, headers=admin).status_code == 409
    assert client.post('/boxes/tag', json={'ids': [first['id']], 'location': 'goa'}, headers=admin).status_code == 409
    assert client.delete(f'/boxes/{first["id"]}', headers=admin).status_code == 409
    assert client.delete(f'/boxes/{second["id"]}', headers=admin).status_code == 204


def test_a_packing_list_is_saved_whole_or_not_at_all(client, admin, chennai):
    a = season_code(client, chennai)
    ok = box('200.BLR', [{'code': a, 'qty': 1}])
    bad = box('201.BLR', [{'code': 'NO-SUCH-CODE', 'qty': 1}])
    r = client.post('/boxes', json={'boxes': [ok, bad]}, headers=admin)
    assert r.status_code == 422 and '201.BLR' in r.text and 'NO-SUCH-CODE' in r.text
    assert all(x['boxNo'] != '200.BLR' for x in client.get('/boxes', headers=admin).json())

    assert client.post('/boxes', json={'boxes': [ok]}, headers=admin).status_code == 200
    # the same box number again, as another box, is refused; the same box (same id) is an edit
    assert (
        client.post('/boxes', json={'boxes': [box('200.blr', [{'code': a, 'qty': 2}])]}, headers=admin).status_code
        == 409
    )
    edited = client.post('/boxes', json={'boxes': [{**ok, 'lines': [{'code': a, 'qty': 5}]}]}, headers=admin).json()[0]
    assert edited['lines'][0]['qty'] == 5 and edited['history'][-1]['action'] == 'edited'
    assert (
        client.post(
            '/boxes', json={'boxes': [box('202', [{'code': a, 'qty': 1}], location='warehouse')]}, headers=admin
        ).status_code
        == 422
    )
