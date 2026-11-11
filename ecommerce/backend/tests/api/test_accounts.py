import re
import uuid

from app.modules.mail import service as mail

from .conftest import bearer, signup


def test_signup_sign_in_and_profile(client):
    email = f'{uuid.uuid4().hex[:8]}@Example.com'
    headers, customer = signup(client, email)
    assert customer['email'] == email.lower() and customer['name'] == 'Asha Mathew'
    assert client.get('/auth/me', headers=headers).json()['email'] == email.lower()

    # one account per email, whatever its capitals
    again = client.post('/auth/signup', json={'name': 'Asha', 'email': email.upper(), 'password': 'another-pass'})
    assert again.status_code == 409
    short = client.post('/auth/signup', json={'name': 'Asha', 'email': 'x@example.com', 'password': 'short'})
    assert short.status_code == 422

    assert client.post('/auth/login', json={'email': email, 'password': 'wrong-pass'}).status_code == 401
    r = client.post('/auth/login', json={'email': f'  {email.upper()} ', 'password': 'snowfall-2026'})
    assert r.status_code == 200 and r.json()['customer']['id'] == customer['id']

    changed = client.patch('/auth/me', json={'name': '  Asha   M ', 'phone': '+91 98400 99999'}, headers=headers)
    assert changed.json()['name'] == 'Asha M' and changed.json()['phone'] == '+91 98400 99999'
    assert client.patch('/auth/me', json={'phone': 'call me'}, headers=headers).status_code == 422
    assert client.get('/auth/me').status_code == 401
    assert client.get('/auth/me', headers=bearer('junk')).status_code == 401


def test_changing_the_password_signs_other_devices_out(client):
    headers, customer = signup(client)
    wrong = client.post('/auth/change-password', json={'current': 'nope', 'password': 'evergreen-99'}, headers=headers)
    assert wrong.status_code == 422
    r = client.post(
        '/auth/change-password', json={'current': 'snowfall-2026', 'password': 'evergreen-99'}, headers=headers
    )
    assert r.status_code == 200
    assert client.get('/auth/me', headers=headers).status_code == 401  # the old token
    assert client.get('/auth/me', headers=bearer(r.json()['token'])).status_code == 200
    login = {'email': customer['email'], 'password': 'evergreen-99'}
    assert client.post('/auth/login', json=login).status_code == 200


def test_too_many_wrong_passwords_pause_sign_in(client):
    _, customer = signup(client)
    for _ in range(10):
        client.post('/auth/login', json={'email': customer['email'], 'password': 'wrong-pass'})
    r = client.post('/auth/login', json={'email': customer['email'], 'password': 'snowfall-2026'})
    assert r.status_code == 429 and 'Retry-After' in r.headers


def test_password_reset_by_email(client):
    headers, customer = signup(client)
    # an unknown email is answered the same, and nothing is sent
    assert client.post('/auth/forgot-password', json={'email': 'nobody@example.com'}).status_code == 204
    assert mail.OUTBOX == []

    assert client.post('/auth/forgot-password', json={'email': customer['email'].upper()}).status_code == 204
    [email] = mail.OUTBOX
    assert email.to == customer['email'] and 'Reset your' in email.subject
    token = re.search(r'http://shop\.test/reset-password\?token=([\w-]+)', email.text)[1]

    assert (
        client.post('/auth/reset-password', json={'token': 'not-a-real-token', 'password': 'new-pass-123'}).status_code
        == 422
    )
    r = client.post('/auth/reset-password', json={'token': token, 'password': 'new-pass-123'})
    assert r.status_code == 200 and r.json()['customer']['id'] == customer['id']
    assert client.get('/auth/me', headers=bearer(r.json()['token'])).status_code == 200
    assert client.get('/auth/me', headers=headers).status_code == 401  # signed out everywhere else
    # the link works once, and the old password is gone
    assert client.post('/auth/reset-password', json={'token': token, 'password': 'again-123456'}).status_code == 422
    assert client.post('/auth/login', json={'email': customer['email'], 'password': 'snowfall-2026'}).status_code == 401
    assert client.post('/auth/login', json={'email': customer['email'], 'password': 'new-pass-123'}).status_code == 200

    # a few asks in a row send a few emails, then no more for a while
    for _ in range(5):
        client.post('/auth/forgot-password', json={'email': customer['email']})
    assert len(mail.OUTBOX) == 3


def test_the_admin_login(client, customer):
    assert client.post('/admin/login', json={'username': 'admin', 'password': 'wrong'}).status_code == 401
    r = client.post('/admin/login', json={'username': 'Admin', 'password': 'admin-test-pass'})
    assert r.status_code == 200 and r.json()['admin'] == {'username': 'admin'}
    admin = bearer(r.json()['token'])
    assert client.get('/admin/me', headers=admin).json() == {'username': 'admin'}
    # a customer's token opens nothing of the admin's, and the admin's is not a customer's
    assert client.get('/admin/me', headers=customer).status_code == 401
    assert client.get('/admin/catalogue', headers=customer).status_code == 401
    assert client.get('/auth/me', headers=admin).status_code == 401

    changed = client.post(
        '/admin/change-password', json={'current': 'admin-test-pass', 'password': 'temporary-99'}, headers=admin
    )
    assert changed.status_code == 200 and client.get('/admin/me', headers=admin).status_code == 401
    back = bearer(changed.json()['token'])
    assert (
        client.post(
            '/admin/change-password', json={'current': 'temporary-99', 'password': 'admin-test-pass'}, headers=back
        ).status_code
        == 200
    )
