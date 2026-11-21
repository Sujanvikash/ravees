import pytest

from app.core import security
from app.core.config import get_settings
from app.modules.auth import service as auth_service

from .conftest import login

# stands in for the password for a manual discount, which the code keeps only as a hash
DISCOUNT_PASSWORD = 'try-a-discount'
DISCOUNT_PASSWORD_HASH = security.hash_password(DISCOUNT_PASSWORD)


@pytest.fixture
def discount_password(monkeypatch):
    monkeypatch.setattr(auth_service, 'DISCOUNT_PASSWORD_HASH', DISCOUNT_PASSWORD_HASH)


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
    r = client.post('/auth/login', json={'username': 'cochin', 'password': 'nope'})
    assert r.status_code == 401 and r.json() == {'detail': 'That password is not right for this login.'}
    assert client.post('/auth/login', json={'username': 'nobody', 'password': 'x'}).status_code == 401
    assert client.get('/auth/me').status_code == 401
    assert client.get('/auth/me', headers={'Authorization': 'Bearer junk'}).json() == {'detail': 'Sign in again.'}
    assert client.get('/auth/me', headers={'Authorization': 'Basic abc'}).status_code == 401


def test_login_body_is_checked(client):
    r = client.post('/auth/login', json={'username': 'cochin'})
    assert r.status_code == 422 and isinstance(r.json()['detail'], list)


def test_too_many_wrong_passwords(client):
    for _ in range(get_settings().login_max_failures):
        assert client.post('/auth/login', json={'username': 'mumbai', 'password': 'nope'}).status_code == 401
    r = client.post('/auth/login', json={'username': 'mumbai', 'password': 'mumbai@2026'})
    assert r.status_code == 429
    assert r.json()['detail'].startswith('Too many wrong passwords for this login.')
    assert int(r.headers['Retry-After']) > 0
    login(client, 'cochin')  # other logins are not affected


def test_check_password_takes_the_discount_password_not_the_logins_own(client, chennai, discount_password):
    ok = {'password': DISCOUNT_PASSWORD}
    assert client.post('/auth/check-password', json=ok, headers=chennai).status_code == 204
    own = client.post('/auth/check-password', json={'password': 'chennai@2026'}, headers=chennai)
    assert own.status_code == 401 and own.json() == {'detail': 'That isn’t the password for giving a discount.'}
    assert client.get('/auth/me', headers=chennai).status_code == 200  # a wrong password doesn't sign the store out
    assert client.post('/auth/check-password', json=ok).status_code == 401


def test_the_real_discount_password_is_kept_only_as_a_hash():
    assert auth_service.DISCOUNT_PASSWORD_HASH.startswith('$argon2id$')


def test_check_password_has_a_brake_of_its_own(client, chennai, discount_password):
    for _ in range(get_settings().login_max_failures):
        assert client.post('/auth/check-password', json={'password': 'nope'}, headers=chennai).status_code == 401
    ok = {'password': DISCOUNT_PASSWORD}
    assert client.post('/auth/check-password', json=ok, headers=chennai).status_code == 429
    # wrong discount passwords never hold up signing in
    assert client.post('/auth/login', json={'username': 'chennai', 'password': 'chennai@2026'}).status_code == 200


def sign_in_of(client, admin, token):
    """The admin's Sign-ins row for the sign-in this token belongs to."""
    from app.core import security

    sid = security.decode_access_token(token, secret=get_settings().jwt_secret.get_secret_value()).session_id
    return next(r for r in client.get('/sign-ins', headers=admin).json() if r['id'] == sid)


def test_sign_ins_and_sign_outs_are_kept_for_the_admin(client, admin):
    r = client.post(
        '/auth/login', json={'username': 'mumbai', 'password': 'mumbai@2026'}, headers={'User-Agent': 'Shop PC'}
    )
    token = r.json()['token']
    mumbai = {'Authorization': f'Bearer {token}'}
    row = sign_in_of(client, admin, token)
    assert (row['username'], row['location'], row['device'], row['address']) == (
        'mumbai',
        'mumbai',
        'Shop PC',
        'testclient',
    )
    assert row['endedAt'] is None and row['ended'] is None and row['expiresAt'] > row['at']

    # only the admin reads them
    assert client.get('/sign-ins', headers=mumbai).status_code == 403
    # newest first, and from a given time on
    rows = client.get('/sign-ins', headers=admin).json()
    assert rows[0]['at'] >= rows[-1]['at']
    assert client.get('/sign-ins', params={'since': '2099-01-01T00:00:00Z'}, headers=admin).json() == []

    assert client.post('/auth/logout', headers=mumbai).status_code == 204
    row = sign_in_of(client, admin, token)
    assert row['ended'] == 'signed-out' and row['endedAt'] >= row['at']
    assert client.post('/auth/logout').status_code == 401


def test_a_new_password_ends_the_logins_sign_ins(client, admin):
    token = client.post('/auth/login', json={'username': 'goa', 'password': 'goa@2026'}).json().get('token')
    if token is None:  # Goa was retired: use Pune
        token = client.post('/auth/login', json={'username': 'pune', 'password': 'pune@2026'}).json()['token']
    user = sign_in_of(client, admin, token)['username']
    assert client.put(f'/users/{user}/password', json={'password': 'a-new-pass'}, headers=admin).status_code == 200
    try:
        row = sign_in_of(client, admin, token)
        assert row['ended'] == 'password' and row['endedAt']
    finally:
        client.post(f'/users/{user}/password/reset', headers=admin)
