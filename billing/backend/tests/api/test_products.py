import uuid

from .conftest import login
from .test_sales import sale, season_code, stock_of

PRODUCT_FIELDS = {
    'code',
    'name',
    'type',
    'dept',
    'barcode',
    'hsn',
    'mrp',
    'offer',
    'cost',
    'gst',
    'inSeason',
    'hasImage',
    'shop',
}
WREATH = {'name': 'Handmade  wreath 12 inch', 'dept': 'Wall decoration', 'mrp': 1200, 'offer': 999, 'cost': 400}


def test_catalogue(client, chennai):
    data = client.get('/products', headers=chennai).json()
    assert data['season'] == '2026'
    assert len(data['products']) >= 2922 + 477
    assert set(data['products'][0]) == PRODUCT_FIELDS
    season = [p for p in data['products'] if p['inSeason']]
    assert len(season) == 477
    tr = next(p for p in data['products'] if p['code'] == 'TR0232')
    assert tr['dept'] == 'Trees' and tr['mrp'] > 0 and tr['shop'] is None
    assert isinstance(tr['mrp'], int | float) and isinstance(tr['gst'], int | float)


def test_catalogue_needs_sign_in(client):
    assert client.get('/products').status_code == 401


def test_admin_edits_the_season(client, admin, chennai):
    assert client.patch('/products/TA275', json={'inSeason': True}, headers=chennai).status_code == 403
    assert client.patch('/products/ta275', json={'inSeason': True}, headers=admin).json()['inSeason'] is True
    codes = {p['code'] for p in client.get('/products', headers=chennai).json()['products'] if p['inSeason']}
    assert 'TA275' in codes
    client.patch('/products/TA275', json={'inSeason': False}, headers=admin)
    r = client.patch('/products/NOPE1', json={'inSeason': True}, headers=admin)
    assert r.status_code == 404 and r.json() == {'detail': 'No product with code NOPE1.'}
    assert client.patch('/products/TA275', json={}, headers=admin).status_code == 422


def test_shop_products_get_their_showrooms_codes(client, admin, chennai):
    a = client.post('/products', json=WREATH, headers=chennai)
    assert a.status_code == 201
    a = a.json()
    b = client.post('/products', json=WREATH, headers=chennai).json()
    assert a['code'] == 'CHN-0001' and b['code'] == 'CHN-0002'
    assert a['name'] == 'Handmade wreath 12 inch' and a['shop']['by'] == 'Chennai Egmore' and a['inSeason']
    assert set(a) == PRODUCT_FIELDS

    c = client.post('/products', json={**WREATH, 'location': 'palavakkam'}, headers=admin).json()
    assert c['code'] == 'PLK-0001' and c['shop'] == {'location': 'palavakkam', 'by': 'Admin', 'at': c['shop']['at']}

    # a showroom can't add to another showroom
    d = client.post('/products', json={**WREATH, 'location': 'cochin'}, headers=chennai).json()
    assert d['code'] == 'CHN-0003'

    codes = {p['code'] for p in client.get('/products', headers=chennai).json()['products']}
    assert {'CHN-0001', 'CHN-0002', 'CHN-0003', 'PLK-0001'} <= codes


def test_shop_product_defaults(client, chennai):
    p = client.post('/products', json={'name': 'Star', 'dept': 'Trees', 'mrp': 250, 'gst': 12}, headers=chennai).json()
    assert (p['offer'], p['cost'], p['gst'], p['hsn'], p['barcode'], p['type']) == (250, 0, 12, '', '', 'Product')


def test_shop_product_rules(client, admin, chennai):
    def refused(body, headers=chennai):
        r = client.post('/products', json=body, headers=headers)
        assert r.status_code == 422, r.text
        return r.json()['detail']

    assert refused({**WREATH, 'offer': 1500}) == 'The offer price can’t be above the MRP.'
    assert refused({**WREATH, 'gst': 7}) == 'GST must be 0, 5, 12, 18 or 28%.'
    assert refused(WREATH, admin) == 'Choose the showroom.'  # admin must pick a showroom
    assert refused({**WREATH, 'location': 'delhi'}, admin) == 'Choose the showroom.'
    for change in ({'mrp': 0}, {'offer': 0}, {'cost': -1}, {'name': 'x'}, {'dept': ''}):
        assert isinstance(refused({**WREATH, **change}), list)  # FastAPI's field errors
    assert client.post('/products', json=WREATH).status_code == 401


def test_a_showroom_adds_stock_for_its_own_products(client, chennai):
    own = client.post(
        '/products', json={'name': 'Felt star garland', 'dept': 'Garlands', 'mrp': 300}, headers=chennai
    ).json()
    body = {
        'id': str(uuid.uuid4()),
        'file': 'Added by hand',
        'source': 'own-product',
        'lines': [{'code': own['code'], 'qty': 6}],
    }
    r = client.post('/stock/imports', json=body, headers=chennai)
    assert r.status_code == 201, r.text
    assert stock_of(client, chennai, 'chennai', own['code']) == 6

    # not for catalogue products, nor another showroom's own
    other = client.post(
        '/products',
        json={'name': 'Cochin shell wreath', 'dept': 'Wreaths', 'mrp': 500},
        headers=login(client, 'cochin'),
    ).json()
    for code in (season_code(client, chennai), other['code']):
        r = client.post(
            '/stock/imports',
            json={**body, 'id': str(uuid.uuid4()), 'lines': [{'code': code, 'qty': 1}]},
            headers=chennai,
        )
        assert r.status_code == 422 and 'own products' in r.json()['detail']


def test_a_new_product_can_keep_its_barcode(client, chennai):
    body = {'name': 'Old season bauble set', 'dept': 'Ornaments', 'mrp': 450, 'barcode': '8901234567890'}
    p = client.post('/products', json=body, headers=chennai).json()
    assert p['barcode'] == '8901234567890' and p['code'].startswith('CHN-')
    again = client.post('/products', json=body, headers=chennai)
    assert (
        again.status_code == 422 and again.json()['detail'] == f'That barcode is already on {p["code"]} · {p["name"]}.'
    )


def test_product_picture(client, admin, chennai):
    picture = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    assert client.put('/products/TA275/image', json={'image': picture}, headers=chennai).status_code == 200
    assert client.delete('/products/TA275/image', headers=chennai).status_code == 403
    assert client.put('/products/TA275/image', json={'image': 'http://x/y.png'}, headers=admin).status_code == 422
    assert client.put('/products/ta275/image', json={'image': picture}, headers=admin).json()['hasImage'] is True
    assert client.get('/products/images', params={'codes': ['TA275', 'TR0232']}, headers=chennai).json() == {
        'TA275': picture
    }
    assert client.delete('/products/TA275/image', headers=admin).json()['hasImage'] is False
    assert client.get('/products/images', params={'codes': ['TA275']}, headers=chennai).json() == {}


def test_the_admin_edits_every_detail_of_a_product(client, admin, chennai):
    own = client.post('/products', json={**WREATH, 'barcode': '8901234500011'}, headers=chennai).json()
    code = own['code']
    billed = client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'upi', received=999), headers=chennai)
    assert billed.status_code == 201, billed.text

    edit = {
        'name': 'Handmade  wreath 14 inch',
        'type': 'Box',
        'dept': 'Wreaths',
        'mrp': 1500,
        'offer': 1250,
        'cost': 520.5,
        'gst': 12,
        'hsn': '6702',
        'barcode': '8901234500028',
    }
    assert client.put(f'/products/{code}', json=edit, headers=chennai).status_code == 403
    assert client.put(f'/products/{code}', json=edit).status_code == 401
    r = client.put(f'/products/{code.lower()}', json=edit, headers=admin)
    assert r.status_code == 200, r.text
    p = r.json()
    assert set(p) == PRODUCT_FIELDS and p['code'] == code and p['shop']['location'] == 'chennai'
    assert (p['name'], p['type'], p['dept'], p['mrp'], p['offer'], p['cost'], p['gst'], p['hsn'], p['barcode']) == (
        'Handmade wreath 14 inch', 'Box', 'Wreaths', 1500, 1250, 520.5, 12, '6702', '8901234500028'
    )  # fmt: skip
    listed = next(x for x in client.get('/products', headers=chennai).json()['products'] if x['code'] == code)
    assert listed == p

    # bills made before keep their price; new ones use the new one
    old = next(s for s in client.get('/sales', headers=admin).json() if s['id'] == billed.json()['id'])
    assert old['lines'][0]['price'] == 999
    again = client.post('/sales', json=sale([{'code': code, 'qty': 1}], 'upi', received=1250), headers=chennai)
    assert again.status_code == 201, again.text
    assert again.json()['lines'][0]['price'] == 1250

    # no offer price sells at MRP
    assert client.put(f'/products/{code}', json={**edit, 'offer': None}, headers=admin).json()['offer'] == 1500

    def refused(body, product=code):
        r = client.put(f'/products/{product}', json=body, headers=admin)
        assert r.status_code == 422, r.text
        return r.json()['detail']

    assert refused({**edit, 'offer': 1600}) == 'The offer price can’t be above the MRP.'
    assert refused({**edit, 'gst': 7}) == 'GST must be 0, 5, 12, 18 or 28%.'
    other = client.post('/products', json={**WREATH, 'barcode': '8901234500035'}, headers=chennai).json()
    assert (
        refused({**edit, 'barcode': '8901234500035'})
        == f'That barcode is already on {other["code"]} · {other["name"]}.'
    )
    for change in ({'mrp': 0}, {'offer': 0}, {'cost': -1}, {'name': 'x'}):
        assert isinstance(refused({**edit, **change}), list)  # FastAPI's field errors
    r = client.put('/products/NOPE1', json=edit, headers=admin)
    assert r.status_code == 404 and r.json() == {'detail': 'No product with code NOPE1.'}
