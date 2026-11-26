"""The passwords the admin sees and sets in Settings → Passwords (app/modules/system/passwords.py)."""

import pytest
from sqlalchemy import text

from app.core import security
from app.core.database import get_engine
from app.modules.demo.builder import build_demo, demo_is_current
from app.modules.system import passwords

from .conftest import login

# stand in for the built-in passwords, which the code keeps only as hashes
BUILT_IN = {kind: security.hash_password(f'built-in-{kind}') for kind in passwords.KINDS}


def _forget_set_passwords() -> None:
    with get_engine().begin() as conn:
        conn.execute(text("delete from app_settings where key like 'password:%'"))
        if conn.scalar(text("select to_regclass('demo.app_settings')")):
            conn.execute(text("delete from demo.app_settings where key like 'password:%'"))


@pytest.fixture(autouse=True)
def built_in(monkeypatch):
    """Every test starts on the built-in passwords, and leaves none of its own behind."""
    for kind, password_hash in BUILT_IN.items():
        monkeypatch.setitem(passwords.BUILT_IN, kind, password_hash)
    _forget_set_passwords()
    yield
    _forget_set_passwords()


@pytest.fixture
def demo_ready():
    if not demo_is_current():
        build_demo()


def test_the_admin_sees_and_changes_the_passwords(client, admin, chennai):
    r = client.get('/settings/passwords', headers=admin)
    assert r.status_code == 200
    assert r.json() == [{'kind': kind, 'password': None} for kind in passwords.KINDS]  # built-in: not readable
    assert client.get('/settings/passwords', headers=chennai).status_code == 403
    r = client.put('/settings/passwords/edit_bill', json={'password': 'by-a-counter'}, headers=chennai)
    assert r.status_code == 403

    # the built-in one works until the admin sets another, then only the new one does
    assert (
        client.post('/sales/edit-password', json={'password': 'built-in-edit_bill'}, headers=chennai).status_code == 204
    )
    r = client.put('/settings/passwords/edit_bill', json={'password': 'counter-edit'}, headers=admin)
    assert r.status_code == 200 and r.json() == {'kind': 'edit_bill', 'password': 'counter-edit'}
    assert client.post('/sales/edit-password', json={'password': 'counter-edit'}, headers=chennai).status_code == 204
    assert (
        client.post('/sales/edit-password', json={'password': 'built-in-edit_bill'}, headers=chennai).status_code == 403
    )
    listed = {p['kind']: p['password'] for p in client.get('/settings/passwords', headers=admin).json()}
    assert listed == {'edit_bill': 'counter-edit', 'delete_bill': None, 'discount': None, 'demo': None}

    for kind, check, wrong in (
        ('delete_bill', '/sales/delete-password', 403),
        ('discount', '/auth/check-password', 401),
    ):
        assert (
            client.put(f'/settings/passwords/{kind}', json={'password': f'new-{kind}'}, headers=admin).status_code
            == 200
        )
        assert client.post(check, json={'password': f'new-{kind}'}, headers=chennai).status_code == 204
        assert client.post(check, json={'password': f'built-in-{kind}'}, headers=chennai).status_code == wrong

    short = client.put('/settings/passwords/edit_bill', json={'password': 'short'}, headers=admin)
    assert short.status_code == 422 and short.json()['detail'] == 'Use at least 6 characters.'
    assert client.put('/settings/passwords/nothing', json={'password': 'long enough'}, headers=admin).status_code == 422
    # never in the settings everyone reads, signed in or not
    assert 'counter-edit' not in client.get('/settings').text
    assert 'counter-edit' not in client.get('/settings', headers=chennai).text


def test_the_demo_switch_is_the_real_admins_and_the_demo_keeps_its_own(client, admin, demo_ready):
    assert client.put('/settings/passwords/demo', json={'password': 'open-the-demo'}, headers=admin).status_code == 200
    assert client.post('/auth/demo/unlock', json={'password': 'built-in-demo'}).status_code == 401
    assert client.post('/auth/demo/unlock', json={'password': 'open-the-demo'}).status_code == 204
    signed_in = {}
    for username in ('admin', 'chennai'):
        r = client.post('/auth/demo', json={'username': username, 'password': 'open-the-demo'})
        assert r.status_code == 200, r.text
        signed_in[username] = {'Authorization': f'Bearer {r.json()["token"]}'}
    d_admin, d_chennai = signed_in['admin'], signed_in['chennai']

    # the demo's admin sees and sets only the demo's own passwords for editing and deleting a bill
    assert [p['kind'] for p in client.get('/settings/passwords', headers=d_admin).json()] == [
        'edit_bill',
        'delete_bill',
    ]
    for kind in ('demo', 'discount'):
        r = client.put(f'/settings/passwords/{kind}', json={'password': 'from-the-demo'}, headers=d_admin)
        assert r.status_code == 403
    assert (
        client.put('/settings/passwords/edit_bill', json={'password': 'demo-edit'}, headers=d_admin).status_code == 200
    )
    assert client.post('/sales/edit-password', json={'password': 'demo-edit'}, headers=d_chennai).status_code == 204
    # the real data's are untouched
    chennai = login(client, 'chennai')
    assert client.post('/sales/edit-password', json={'password': 'demo-edit'}, headers=chennai).status_code == 403
    listed = {p['kind']: p['password'] for p in client.get('/settings/passwords', headers=admin).json()}
    assert listed['edit_bill'] is None and listed['demo'] == 'open-the-demo'
