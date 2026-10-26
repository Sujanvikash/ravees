"""
Passwords and tokens, as plain functions with no web framework or database in them.

Passwords are hashed with Argon2id (argon2-cffi's defaults). Login tokens are JWTs signed with HS256; `iat` is
kept to the microsecond so a token issued a moment before a password change is told apart from one issued a
moment after it.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

JWT_ALGORITHM = 'HS256'
DEFAULT_PASSWORD_SUFFIX = '@2026'

_hasher = PasswordHasher()


def default_password(username: str) -> str:
    """The password every login starts with, and goes back to on reset: chennai@2026 ... admin@2026."""
    return f'{username}{DEFAULT_PASSWORD_SUFFIX}'


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """True if the password matches the hash. A malformed hash counts as a mismatch."""
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    """True if the hash was made with weaker settings than today's, so it should be redone at the next login."""
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


class TokenError(Exception):
    """The token is missing a claim, expired, tampered with or signed with another secret."""


@dataclass(frozen=True, slots=True)
class TokenClaims:
    subject: str
    role: str
    issued_at: float  # seconds since the epoch, with microseconds
    expires_at: float


def create_access_token(
    subject: str, role: str, *, secret: str, lifetime: timedelta, now: datetime | None = None
) -> str:
    """A signed token for a login: sub (username), role, iat and exp."""
    now = now or datetime.now(UTC)
    claims = {'sub': subject, 'role': role, 'iat': now.timestamp(), 'exp': int((now + lifetime).timestamp())}
    return jwt.encode(claims, secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, *, secret: str) -> TokenClaims:
    """The claims of a valid token. Raises TokenError for anything else."""
    try:
        claims = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM], options={'require': ['sub', 'iat', 'exp']})
    except jwt.PyJWTError as error:
        raise TokenError(str(error)) from error
    if not isinstance(claims['sub'], str):
        raise TokenError('The subject is not a username.')
    return TokenClaims(
        subject=claims['sub'],
        role=str(claims.get('role', '')),
        issued_at=float(claims['iat']),
        expires_at=float(claims['exp']),
    )
