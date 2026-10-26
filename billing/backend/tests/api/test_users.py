from .conftest import login


def test_only_admin_manages_passwords(client, chennai):
    assert client.get('/users', headers=chennai).status_code == 403
    r = client.put('/users/goa/password', json={'password': 'secret99'}, headers=chennai)
    assert r.status_code == 403 and r.json() == {'detail': 'Only the admin can do this.'}
    assert client.post('/users/goa/password/reset', headers=chennai).status_code == 403
    assert client.get('/users').status_code == 401


def test_admin_lists_logins_in_order(client, admin):
    users = client.get('/users', headers=admin).json()
    assert [u['username'] for u in users] == ['chennai', 'bengaluru', 'goa', 'mumbai', 'pune', 'admin']
    assert set(users[0]) == {'username', 'role', 'location', 'passwordChangedAt'}
    assert users[-1]['role'] == 'admin' and users[-1]['location'] is None


def test_admin_changes_and_resets_a_password(client, admin):
    old = login(client, 'pune')
    r = client.put('/users/pune/password', json={'password': 'abc'}, headers=admin)
    assert r.status_code == 422 and r.json() == {'detail': 'Use at least 6 characters.'}
    r = client.put('/users/pune/password', json={'password': 'pune-new-pass'}, headers=admin)
    assert r.json()['passwordChangedAt']
    assert client.post('/auth/login', json={'username': 'pune', 'password': 'pune@2026'}).status_code == 401
    new = login(client, 'pune', 'pune-new-pass')
    assert client.get('/auth/me', headers=old).status_code == 401  # signed out by the change
    assert client.get('/auth/me', headers=new).status_code == 200

    r = client.post('/users/pune/password/reset', headers=admin)
    assert r.json()['passwordChangedAt'] is None
    login(client, 'pune')


def test_unknown_login(client, admin):
    r = client.put('/users/nobody/password', json={'password': 'secret99'}, headers=admin)
    assert r.status_code == 404 and r.json() == {'detail': 'No login called nobody.'}
    assert client.post('/users/nobody/password/reset', headers=admin).status_code == 404
