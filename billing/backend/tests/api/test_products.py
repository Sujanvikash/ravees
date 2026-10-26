PRODUCT_FIELDS = {'code', 'name', 'type', 'dept', 'barcode', 'hsn', 'mrp', 'offer', 'cost', 'gst', 'inSeason', 'shop'}
WREATH = {'name': 'Handmade  wreath 12 inch', 'dept': 'Wall decoration', 'mrp': 1200, 'offer': 999, 'cost': 400}


def test_catalogue(client, chennai):
    data = client.get('/products', headers=chennai).json()
    assert data['season'] == '2026'
    assert len(data['products']) >= 2922
    assert set(data['products'][0]) == PRODUCT_FIELDS
    season = [p for p in data['products'] if p['inSeason']]
    assert len(season) == 25
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
    assert a['name'] == 'Handmade wreath 12 inch' and a['shop']['by'] == 'Chennai' and a['inSeason']
    assert set(a) == PRODUCT_FIELDS

    c = client.post('/products', json={**WREATH, 'location': 'bengaluru'}, headers=admin).json()
    assert c['code'] == 'BLR-0001' and c['shop'] == {'location': 'bengaluru', 'by': 'Admin', 'at': c['shop']['at']}

    # a showroom can't add to another showroom
    d = client.post('/products', json={**WREATH, 'location': 'goa'}, headers=chennai).json()
    assert d['code'] == 'CHN-0003'

    codes = {p['code'] for p in client.get('/products', headers=chennai).json()['products']}
    assert {'CHN-0001', 'CHN-0002', 'CHN-0003', 'BLR-0001'} <= codes


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
