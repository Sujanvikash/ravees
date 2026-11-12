from .conftest import signup, upload


def test_enquiries(client, admin):
    contact = {'type': 'contact', 'name': 'Ravi', 'email': 'ravi@example.com', 'message': 'Do you deliver to Madurai?'}
    r = client.post('/enquiries', json=contact)
    assert r.status_code == 201 and r.json()['status'] == 'new' and r.json()['customerId'] is None
    assert client.post('/enquiries', json={'type': 'contact', 'name': 'Ravi'}).status_code == 422  # no way to answer
    assert client.post('/enquiries', json={**contact, 'type': 'spam'}).status_code == 422

    # a signed-in customer's quote request is linked to them, with their email and phone
    headers, customer = signup(client)
    quote = {'type': 'quote-request', 'name': 'Asha', 'details': {'items': [{'id': 'grand-tree', 'quantity': 2}]}}
    linked = client.post('/enquiries', json=quote, headers=headers).json()
    assert linked['customerId'] == customer['id'] and linked['email'] == customer['email'] and linked['phone']

    listed = client.get('/admin/enquiries', headers=admin).json()
    assert listed[0]['id'] == linked['id'] and listed[0]['details']['items'][0]['quantity'] == 2
    assert (
        client.patch(f'/admin/enquiries/{linked["id"]}', json={'status': 'contacted'}, headers=admin).json()['status']
        == 'contacted'
    )
    assert client.patch(f'/admin/enquiries/{linked["id"]}', json={'status': 'lost'}, headers=admin).status_code == 422
    assert client.delete(f'/admin/enquiries/{linked["id"]}', headers=admin).status_code == 204
    assert client.get('/admin/enquiries', headers=headers).status_code == 401


def test_too_many_enquiries_from_one_place(client):
    contact = {'type': 'contact', 'name': 'Bot', 'email': 'bot@example.com'}
    codes = [client.post('/enquiries', json=contact).status_code for _ in range(11)]
    assert codes[:10] == [201] * 10 and codes[10] == 429


def test_showrooms_testimonials_and_settings(client, admin):
    photo = upload(client, admin)
    stores = [
        {'name': 'Egmore', 'address': 'Casa Major Road', 'phone': '98400 00000', 'imageIds': [photo['id']]},
        {'name': 'ECR', 'address': ' East Coast Road ', 'mapUrl': 'https://maps.app.goo.gl/x'},
    ]
    first = client.post(
        '/admin/showrooms', json={'city': 'Chennai', 'isFlagship': True, 'stores': stores}, headers=admin
    )
    assert first.status_code == 201
    egmore, ecr = first.json()['stores']
    assert (
        egmore['phone'] == '98400 00000' and egmore['imageIds'] == [photo['id']] and egmore['images'] == [photo['url']]
    )
    assert ecr['address'] == 'East Coast Road' and ecr['mapUrl'] == 'https://maps.app.goo.gl/x' and ecr['images'] == []
    gone = {**stores[0], 'imageIds': ['00000000-0000-0000-0000-000000000000']}
    assert client.post('/admin/showrooms', json={'city': 'Pune', 'stores': [gone]}, headers=admin).status_code == 422
    second = client.post(
        '/admin/showrooms', json={'city': 'Kochi', 'isFlagship': True, 'features': [' Lights ', '']}, headers=admin
    ).json()
    assert second['features'] == ['Lights']
    rooms = {s['id']: s for s in client.get('/storefront').json()['showrooms']}
    assert rooms[second['id']]['isFlagship'] and not rooms[first.json()['id']]['isFlagship']  # one flagship
    client.put('/admin/showrooms/order', json={'ids': [second['id']]}, headers=admin)
    assert client.get('/admin/showrooms', headers=admin).json()[0]['id'] == second['id']
    assert (
        client.patch(f'/admin/showrooms/{second["id"]}', json={'timing': '10 AM – 9 PM'}, headers=admin).json()[
            'timing'
        ]
        == '10 AM – 9 PM'
    )
    assert client.delete(f'/admin/showrooms/{second["id"]}', headers=admin).status_code == 204
    assert client.delete(f'/admin/showrooms/{second["id"]}', headers=admin).status_code == 404

    said = client.post(
        '/admin/testimonials', json={'author': 'The Menons', 'quote': 'Lovely tree.', 'rating': 5}, headers=admin
    )
    assert said.status_code == 201 and said.json()['treeModel'] == ''
    assert (
        client.post(
            '/admin/testimonials', json={'author': 'X Y', 'quote': 'Hm', 'rating': 6}, headers=admin
        ).status_code
        == 422
    )
    assert (
        client.patch(f'/admin/testimonials/{said.json()["id"]}', json={'rating': 4}, headers=admin).json()['rating']
        == 4
    )
    assert said.json()['id'] in {t['id'] for t in client.get('/storefront').json()['testimonials']}

    settings = client.patch('/admin/settings', json={'deliveryFee': 99}, headers=admin).json()
    assert settings['deliveryFee'] == 99
    assert client.get('/storefront').json()['settings']['deliveryFee'] == 99
    assert client.patch('/admin/settings', json={'deliveryFee': -1}, headers=admin).status_code == 422


def test_who_the_invoices_are_from(client, admin):
    seller = client.get('/admin/settings/invoice', headers=admin).json()
    # the Egmore store's business until the admin changes it
    assert seller['name'] == 'SIANNA COLLECTION' and seller['state'] == 'Tamil Nadu'
    assert seller['gstin'] == '33AFUPE5958A1ZF' and 'Egmore' in seller['address']
    mine = {**seller, 'gstin': '33abcde1234f1z5', 'state': 'tamilnadu', 'address': ' 54 Casa Major Road \n\n Egmore '}
    saved = client.put('/admin/settings/invoice', json=mine, headers=admin).json()
    assert saved['gstin'] == '33ABCDE1234F1Z5' and saved['state'] == 'Tamil Nadu'
    assert saved['address'] == '54 Casa Major Road\nEgmore'
    # a GSTIN of another state, a GSTIN of the wrong shape, a state that isn't one
    for wrong in ({'state': 'Kerala'}, {'gstin': '33ABC'}, {'state': 'Narnia'}):
        assert client.put('/admin/settings/invoice', json={**mine, **wrong}, headers=admin).status_code == 422
    assert client.get('/admin/settings/invoice').status_code == 401
