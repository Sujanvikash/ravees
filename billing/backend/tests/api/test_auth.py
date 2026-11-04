from app.core.config import get_settings

from .conftest import login


def test_health(client):
    assert client.get('http://testserver/health').json() == {'ok': True}


def test_login_and_me(client):
    r = client.post('/auth/login', json={'username': 'Chennai', 'password': 'chennai@2026'})
    assert r.status_code == 200
    assert r.json()['session'] == {'username': 'chennai', 'role': 'location', 'location': 'chennai', 'demo': False}
    me = client.get('/auth/me', headers={'Authorization': f'Bearer {r.json()["token"]}'})
    assert me.json() == {'username': 'chennai', 'role': 'location', 'location': 'chennai', 'demo': False}


def test_admin_session(client, admin):
    assert client.get('/auth/me', headers=admin).json() == {
        'username': 'admin',
        'role': 'admin',
        'location': None,
        'demo': False,
    }


def test_wrong_password_and_no_token(client):
    r = client.post('/auth/login', json={'username': 'goa', 'password': 'nope'})
    assert r.status_code == 401 and r.json() == {'detail': 'That password is not right for this login.'}
    assert client.post('/auth/login', json={'username': 'nobody', 'password': 'x'}).status_code == 401
    assert client.get('/auth/me').status_code == 401
    assert client.get('/auth/me', headers={'Authorization': 'Bearer junk'}).json() == {'detail': 'Sign in again.'}
    assert client.get('/auth/me', headers={'Authorization': 'Basic abc'}).status_code == 401


def test_login_body_is_checked(client):
    r = client.post('/auth/login', json={'username': 'goa'})
    assert r.status_code == 422 and isinstance(r.json()['detail'], list)


def test_too_many_wrong_passwords(client):
    for _ in range(get_settings().login_max_failures):
        assert client.post('/auth/login', json={'username': 'mumbai', 'password': 'nope'}).status_code == 401
    r = client.post('/auth/login', json={'username': 'mumbai', 'password': 'mumbai@2026'})
    assert r.status_code == 429
    assert r.json()['detail'].startswith('Too many wrong passwords for this login.')
    assert int(r.headers['Retry-After']) > 0
    login(client, 'goa')  # other logins are not affected


def test_check_password_takes_the_signed_in_logins_own_password(client, chennai):
    assert client.post('/auth/check-password', json={'password': 'chennai@2026'}, headers=chennai).status_code == 204
    wrong = client.post('/auth/check-password', json={'password': 'goa@2026'}, headers=chennai)
    assert wrong.status_code == 401 and wrong.json() == {'detail': 'That password is not right for this login.'}
    assert client.get('/auth/me', headers=chennai).status_code == 200  # a wrong password doesn't sign the store out
    assert client.post('/auth/check-password', json={'password': 'chennai@2026'}).status_code == 401


def test_check_password_shares_the_sign_in_brake(client, chennai):
    for _ in range(get_settings().login_max_failures):
        assert client.post('/auth/check-password', json={'password': 'nope'}, headers=chennai).status_code == 401
    assert client.post('/auth/check-password', json={'password': 'chennai@2026'}, headers=chennai).status_code == 429
    assert client.post('/auth/login', json={'username': 'chennai', 'password': 'chennai@2026'}).status_code == 429
