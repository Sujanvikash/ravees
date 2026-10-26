from datetime import UTC, datetime, timedelta

import jwt
import pytest
from argon2 import PasswordHasher

from app.core import security

SECRET = 'unit-test-secret-' + '0123456789abcdef' * 4  # long enough for HS512 too, so PyJWT doesn't warn


def test_default_password():
    assert security.default_password('chennai') == 'chennai@2026'
    assert security.default_password('admin') == 'admin@2026'


def test_hash_and_verify():
    hashed = security.hash_password('pune-new-pass')
    assert hashed.startswith('$argon2id$')
    assert security.verify_password(hashed, 'pune-new-pass')
    assert not security.verify_password(hashed, 'wrong')
    assert not security.verify_password('not-a-hash', 'pune-new-pass')


def test_needs_rehash():
    assert not security.needs_rehash(security.hash_password('x'))
    weak = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1).hash('x')
    assert security.needs_rehash(weak)
    assert security.needs_rehash('not-a-hash')


def test_token_round_trip():
    now = datetime(2026, 10, 26, 9, 30, 15, 123456, tzinfo=UTC)
    token = security.create_access_token('goa', 'location', secret=SECRET, lifetime=timedelta(days=3650), now=now)
    claims = security.decode_access_token(token, secret=SECRET)
    assert claims.subject == 'goa' and claims.role == 'location'
    assert claims.issued_at == pytest.approx(now.timestamp(), abs=1e-6)  # kept to the microsecond
    assert claims.expires_at == int((now + timedelta(days=3650)).timestamp())
    assert jwt.get_unverified_header(token)['alg'] == 'HS256'


def test_expired_token_is_rejected():
    long_ago = datetime.now(UTC) - timedelta(days=2)
    token = security.create_access_token('goa', 'location', secret=SECRET, lifetime=timedelta(hours=1), now=long_ago)
    with pytest.raises(security.TokenError):
        security.decode_access_token(token, secret=SECRET)


@pytest.mark.parametrize(
    'token',
    [
        'junk',
        security.create_access_token(
            'goa', 'location', secret='another-secret-0123456789abcdefghij', lifetime=timedelta(hours=1)
        ),
        jwt.encode({'sub': 'goa', 'exp': 9_999_999_999}, SECRET, algorithm='HS256'),  # no iat
        jwt.encode({'sub': 'goa', 'iat': 1, 'exp': 9_999_999_999}, SECRET, algorithm='HS512'),  # other algorithm
        jwt.encode({'sub': 7, 'iat': 1, 'exp': 9_999_999_999}, SECRET, algorithm='HS256'),  # not a username
    ],
)
def test_bad_tokens_are_rejected(token):
    with pytest.raises(security.TokenError):
        security.decode_access_token(token, secret=SECRET)
