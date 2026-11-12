from .conftest import category, png, product, upload


def _storefront(client) -> dict:
    return client.get('/storefront').json()


def test_the_admin_builds_the_catalogue_and_the_storefront_shows_it(client, admin):
    photo = upload(client, admin, png(2400, 1200))
    assert photo['url'] == f'http://shop-api.test/api/v1/media/{photo["id"]}.webp'
    assert photo['cardUrl'].endswith('?size=card')
    large = client.get(f'/media/{photo["id"]}.webp')
    assert large.status_code == 200 and large.headers['content-type'] == 'image/webp'
    assert 'immutable' in large.headers['cache-control']
    assert len(client.get(f'/media/{photo["id"]}.webp?size=card').content) < len(large.content)
    assert client.get('/media/not-a-photo.webp').status_code == 404

    trees = category(client, admin, 'Christmas Trees!', icon='🎄', imageId=photo['id'])
    assert trees['id'].startswith('christmas-trees') and trees['imageId'] == photo['id'] and trees['count'] == 0
    second = category(client, admin, 'Christmas Trees!')
    assert second['id'] != trees['id'] and second['id'].startswith(trees['id'])  # a free id of its own

    tree = product(
        client,
        admin,
        trees['id'],
        name='Norway Spruce 7 ft',
        description='Dense, natural-looking branches.',
        specs=[{'label': 'Height', 'value': '7 ft'}],
        sizes=['6 ft', ' 7  ft '],
        price=12499.5,
        mrp=15000,
        featured=True,
        imageIds=[photo['id']],
    )
    assert tree['id'].startswith('norway-spruce-7-ft') and tree['sizes'] == ['6 ft', '7 ft']
    assert tree['price'] == 12499.5 and tree['priceOnRequest'] is False and tree['image'] == photo['cardUrl']
    on_request = product(client, admin, trees['id'], name='Lit wreath')
    assert on_request['price'] is None and on_request['priceOnRequest'] is True and on_request['image'] is None

    shop = _storefront(client)
    shown = {p['id']: p for p in shop['products']}
    assert shown[tree['id']]['categoryLabel'] == 'Christmas Trees!' and shown[tree['id']]['images'] == [photo['url']]
    assert 'visible' not in shown[tree['id']] and 'imageIds' not in shown[tree['id']]  # the admin's fields stay out
    # a product without a price isn't for sale: the shop doesn't show it (nor count it)
    assert on_request['id'] not in shown and {c['id']: c['count'] for c in shop['categories']}[trees['id']] == 1

    # hidden products, and every product of a hidden category, leave the storefront
    client.patch(f'/admin/products/{on_request["id"]}', json={'price': 2400}, headers=admin)
    assert on_request['id'] in {p['id'] for p in _storefront(client)['products']}
    client.patch(f'/admin/products/{on_request["id"]}', json={'visible': False}, headers=admin)
    assert on_request['id'] not in {p['id'] for p in _storefront(client)['products']}
    client.patch(f'/admin/categories/{trees["id"]}', json={'visible': False}, headers=admin)
    assert tree['id'] not in {p['id'] for p in _storefront(client)['products']}
    client.patch(f'/admin/categories/{trees["id"]}', json={'visible': True}, headers=admin)

    # a price can be taken off again (the product leaves the shop); the MRP is never below the price
    off = client.patch(f'/admin/products/{tree["id"]}', json={'price': None, 'mrp': None}, headers=admin).json()
    assert off['price'] is None and off['priceOnRequest'] is True
    assert tree['id'] not in {p['id'] for p in _storefront(client)['products']}
    assert (
        client.patch(f'/admin/products/{tree["id"]}', json={'price': 900, 'mrp': 800}, headers=admin).status_code == 422
    )
    client.patch(f'/admin/products/{tree["id"]}', json={'price': 900}, headers=admin)
    assert client.patch(f'/admin/products/{tree["id"]}', json={'mrp': 500}, headers=admin).status_code == 422
    assert client.patch(f'/admin/products/{tree["id"]}', json={'category': 'nowhere'}, headers=admin).status_code == 404

    # a category with products can't go; the admin's view has the hidden ones too
    assert client.delete(f'/admin/categories/{trees["id"]}', headers=admin).status_code == 409
    full = client.get('/admin/catalogue', headers=admin).json()
    assert on_request['id'] in {p['id'] for p in full['products']}
    assert client.delete(f'/admin/categories/{second["id"]}', headers=admin).status_code == 204


def test_ordering_and_deleting(client, admin):
    group = category(client, admin)
    a, b, c = (product(client, admin, group['id'], price=100) for _ in range(3))
    assert client.put('/admin/products/order', json={'ids': [c['id'], a['id']]}, headers=admin).status_code == 204
    ids = [p['id'] for p in _storefront(client)['products'] if p['category'] == group['id']]
    assert ids[:2] == [c['id'], a['id']] and ids[-1] == b['id']
    assert client.delete(f'/admin/products/{b["id"]}', headers=admin).status_code == 204
    assert client.delete(f'/admin/products/{b["id"]}', headers=admin).status_code == 404


def test_photos_must_be_photos(client, admin):
    bad = client.post('/admin/images', files={'file': ('notes.txt', b'hello', 'text/plain')}, headers=admin)
    assert bad.status_code == 422
    assert client.post('/admin/images', files={'file': ('photo.png', png(), 'image/png')}).status_code == 401
    group = category(client, admin)
    missing = client.post(
        '/admin/products',
        json={'name': 'Ghost', 'category': group['id'], 'imageIds': ['00000000-0000-0000-0000-000000000000']},
        headers=admin,
    )
    assert missing.status_code == 422


def test_a_category_shows_at_most_ten_products(client, admin):
    group = category(client, admin, 'Baubles')
    ten = [product(client, admin, group['id'], price=100) for _ in range(10)]
    eleventh = client.post('/admin/products', json={'name': 'One more', 'category': group['id']}, headers=admin)
    assert eleventh.status_code == 409 and 'Baubles already shows 10 products' in eleventh.text
    # saved hidden it fits, and can be shown once another is hidden
    spare = product(client, admin, group['id'], price=100, visible=False)
    url = f'/admin/products/{spare["id"]}'
    assert client.patch(url, json={'visible': True}, headers=admin).status_code == 409
    client.patch(f'/admin/products/{ten[0]["id"]}', json={'visible': False}, headers=admin)
    assert client.patch(url, json={'visible': True}, headers=admin).status_code == 200
    # nor can one be moved into a full category
    other = category(client, admin)
    stranger = product(client, admin, other['id'], price=100)
    moved = client.patch(f'/admin/products/{stranger["id"]}', json={'category': group['id']}, headers=admin)
    assert moved.status_code == 409


def test_store_exclusives_and_hsn(client, admin):
    group = category(client, admin, 'Lights', hsn='9405')
    assert group['hsn'] == '9405'
    assert client.post('/admin/categories', json={'name': 'Odd', 'hsn': '12'}, headers=admin).status_code == 422
    # a store exclusive is shown with or without a price, and marked as one
    only_here = product(client, admin, group['id'], name='Crystal lantern', storeOnly=True)
    priced = product(client, admin, group['id'], name='Grand chandelier', price=9000, storeOnly=True)
    shown = {p['id']: p for p in _storefront(client)['products']}
    assert shown[only_here['id']]['storeOnly'] is True and shown[only_here['id']]['price'] is None
    assert shown[priced['id']]['storeOnly'] is True and shown[priced['id']]['price'] == 9000
    off = client.patch(f'/admin/products/{only_here["id"]}', json={'storeOnly': False}, headers=admin).json()
    assert off['storeOnly'] is False and only_here['id'] not in {p['id'] for p in _storefront(client)['products']}
