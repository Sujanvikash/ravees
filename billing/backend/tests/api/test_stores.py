import uuid

from .conftest import login
from .test_sales import CUSTOMER, season_code


def test_list_stores_is_public(client):
    stores = client.get('/locations').json()
    ids = {s['id'] for s in stores}
    assert {'chennai', 'bengaluru', 'goa', 'mumbai', 'pune'} <= ids
    assert 'warehouse' not in ids  # the admin's warehouse is not a store
    assert all(s['active'] for s in stores if s['id'] in {'chennai', 'pune'})


def test_add_a_store_with_its_own_login(client, admin, chennai):
    # only the admin can add stores
    assert client.post('/locations', json={'city': 'Chennai', 'area': 'ECR', 'prefix': 'ECR'}, headers=chennai).status_code == 403
    # the prefix must be letters only
    assert client.post('/locations', json={'city': 'Chennai', 'area': 'ECR', 'prefix': 'EC1'}, headers=admin).status_code == 422
    # add it (prefix is upper-cased; its lower-case form is the id/login)
    r = client.post('/locations', json={'city': 'Chennai', 'area': 'ECR', 'prefix': 'ecr'}, headers=admin)
    assert r.status_code == 200, r.text
    store = r.json()
    assert store['id'] == 'ecr' and store['billPrefix'] == 'ECR' and store['city'] == 'Chennai' and store['active'] is True
    # the new login works with the default password, and the store numbers its own bills
    ecr = login(client, 'ecr', 'ecr@2026')
    assert client.post('/quotes', json={'id': str(uuid.uuid4()), 'lines': [{'code': season_code(client, ecr), 'qty': 1}], **CUSTOMER, 'validDays': 15, 'note': ''}, headers=ecr).json()['quoteNo'].startswith('QT-ECR')
    # a duplicate prefix is refused, and the store shows in the public list
    assert client.post('/locations', json={'city': 'X', 'area': 'Y', 'prefix': 'ECR'}, headers=admin).status_code == 409
    assert 'ecr' in {s['id'] for s in client.get('/locations').json()}


def test_remove_empty_store_deletes_it(client, admin):
    client.post('/locations', json={'city': 'Temp', 'area': 'Z', 'prefix': 'TMP'}, headers=admin)
    login(client, 'tmp', 'tmp@2026')  # the login exists
    res = client.delete('/locations/tmp', headers=admin).json()
    assert res['deleted'] is True and res['store'] is None
    assert 'tmp' not in {s['id'] for s in client.get('/locations').json()}
    # the login is gone too
    assert client.post('/auth/login', json={'username': 'tmp', 'password': 'tmp@2026'}).status_code == 401


def test_remove_store_with_history_deactivates_it(client, admin):
    client.post('/locations', json={'city': 'Hist', 'area': 'Z', 'prefix': 'HST'}, headers=admin)
    hst = login(client, 'hst', 'hst@2026')
    # a quote gives the store history, so removing it keeps it (deactivates) rather than deleting
    quote = {'id': str(uuid.uuid4()), 'lines': [{'code': season_code(client, hst), 'qty': 1}], **CUSTOMER, 'validDays': 15, 'note': ''}
    assert client.post('/quotes', json=quote, headers=hst).status_code == 201
    res = client.delete('/locations/hst', headers=admin).json()
    assert res['deleted'] is False and res['store']['active'] is False
    assert {s['id']: s['active'] for s in client.get('/locations').json()}['hst'] is False
    # and it can be brought back
    assert client.post('/locations/hst/reactivate', headers=admin).json()['active'] is True
