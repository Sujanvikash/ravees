"""
Customer accounts and the admin login: signing up and in, tokens, profile and password changes, and password
reset by email. A customer signs in with their email; the admin with a username.
"""

import uuid
from collections.abc import Sequence
from datetime import datetime, timedelta
from functools import lru_cache
from urllib.parse import quote

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core import clock, security
from app.core.config import Settings, get_settings
from app.core.errors import Conflict, InvalidInput, NotFound, TooManyRequests, Unauthorized
from app.core.throttling import LoginThrottle
from app.modules.mail import service as mail

from .models import Admin, Customer, PasswordReset
from .schemas import SignupIn

CUSTOMER, ADMIN = 'customer', 'admin'

# at most this many reset emails per email address in 15 minutes; more asks are answered the same, but send nothing
RESETS_PER_WINDOW = 3


@lru_cache
def get_reset_throttle() -> LoginThrottle:
    return LoginThrottle(RESETS_PER_WINDOW, 15 * 60)


def _email(value: str) -> str:
    return value.strip().lower()


def _secret(settings: Settings) -> str:
    return settings.jwt_secret.get_secret_value()


def by_email(session: Session, email: str) -> Customer | None:
    return session.scalar(select(Customer).where(Customer.email == _email(email)))


def customer_token(customer: Customer, settings: Settings) -> str:
    return security.create_access_token(
        str(customer.id), CUSTOMER, secret=_secret(settings), lifetime=timedelta(days=settings.customer_token_days)
    )


def admin_token(admin: Admin, settings: Settings) -> str:
    return security.create_access_token(
        admin.username, ADMIN, secret=_secret(settings), lifetime=timedelta(hours=settings.admin_token_hours)
    )


def _check_throttle(throttle: LoginThrottle, key: str) -> None:
    wait = throttle.retry_after(key)
    if wait:
        minutes = max(1, round(wait / 60))
        raise TooManyRequests(
            f'Too many wrong passwords. Try again in {minutes} minute{"s" if minutes > 1 else ""}.', retry_after=wait
        )


def signup(session: Session, data: SignupIn, *, at: datetime | None = None) -> Customer:
    email = _email(data.email)
    if by_email(session, email):
        raise Conflict('An account with this email already exists. Sign in instead.')
    customer = Customer(
        name=data.name,
        email=email,
        phone=data.phone,
        password_hash=security.hash_password(data.password),
        created_at=at or clock.now(),
    )
    session.add(customer)
    session.commit()
    return customer


def login(session: Session, throttle: LoginThrottle, email: str, password: str, client: str) -> Customer:
    key = f'{_email(email)}|{client}'
    _check_throttle(throttle, key)
    customer = by_email(session, email)
    if not customer or not security.verify_password(customer.password_hash, password):
        throttle.record_failure(key)
        raise Unauthorized('That email and password don’t match an account.')
    throttle.reset(key)
    if security.needs_rehash(customer.password_hash):
        customer.password_hash = security.hash_password(password)
        session.commit()
    return customer


def _from_token(token: str, role: str, settings: Settings) -> security.TokenClaims:
    try:
        claims = security.decode_access_token(token, secret=_secret(settings))
    except security.TokenError as error:
        raise Unauthorized() from error
    if claims.role != role:
        raise Unauthorized()
    return claims


def _still_valid(claims: security.TokenClaims, changed_at: datetime | None) -> bool:
    return changed_at is None or claims.issued_at >= changed_at.timestamp()


def customer_from_token(session: Session, token: str, settings: Settings) -> Customer:
    claims = _from_token(token, CUSTOMER, settings)
    try:
        customer = session.get(Customer, uuid.UUID(claims.subject))
    except ValueError as error:
        raise Unauthorized() from error
    if not customer or not _still_valid(claims, customer.password_changed_at):
        raise Unauthorized()
    return customer


def admin_from_token(session: Session, token: str, settings: Settings) -> Admin:
    claims = _from_token(token, ADMIN, settings)
    admin = session.get(Admin, claims.subject)
    if not admin or not _still_valid(claims, admin.password_changed_at):
        raise Unauthorized()
    return admin


def forget_address(session: Session, customer: Customer) -> Customer:
    customer.address = None
    session.commit()
    return customer


def update_profile(session: Session, customer: Customer, name: str | None, phone: str | None) -> Customer:
    if name is not None:
        customer.name = ' '.join(name.split())
    if phone is not None:
        customer.phone = phone
    session.commit()
    return customer


def _set_password(account: Customer | Admin, password: str) -> None:
    account.password_hash = security.hash_password(password)
    # a moment back, so the token issued right after this (same request) is newer than the change
    account.password_changed_at = clock.now() - timedelta(milliseconds=1)


def change_password(session: Session, account: Customer | Admin, current: str, password: str) -> None:
    """Changes the password of a signed-in customer or the admin; every other device is signed out."""
    if not security.verify_password(account.password_hash, current):
        raise InvalidInput('The current password isn’t right.')
    _set_password(account, password)
    session.commit()


def forgot_password(session: Session, email: str, settings: Settings | None = None) -> None:
    """Emails a reset link when the email has an account. Says nothing either way, so no one can find out who
    has an account; a few asks in a row are answered the same but send no more emails."""
    settings = settings or get_settings()
    customer = by_email(session, email)
    if not customer:
        return
    throttle = get_reset_throttle()
    if throttle.retry_after(customer.email):
        return
    throttle.record_failure(customer.email)
    token, token_hash = security.new_reset_token()
    now = clock.now()
    session.add(
        PasswordReset(
            customer_id=customer.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=settings.reset_link_minutes),
            created_at=now,
        )
    )
    session.commit()
    url = f'{settings.site_url}/reset-password?token={quote(token)}'
    mail.send(mail.password_reset(customer.email, customer.name, url, settings.reset_link_minutes))


def reset_password(session: Session, token: str, password: str) -> Customer:
    """Sets a new password from an emailed link. The link works once; every other link of the customer's ends
    too, and every device is signed out."""
    reset = session.scalar(
        select(PasswordReset).where(PasswordReset.token_hash == security.hash_reset_token(token)).with_for_update()
    )
    now = clock.now()
    if not reset or reset.used_at or reset.expires_at <= now:
        raise InvalidInput('This reset link has expired or was already used. Ask for a new one.')
    customer = session.get(Customer, reset.customer_id)
    if not customer:
        raise NotFound('That account no longer exists.')
    session.execute(
        update(PasswordReset)
        .where(PasswordReset.customer_id == customer.id, PasswordReset.used_at.is_(None))
        .values(used_at=now)
    )
    _set_password(customer, password)
    session.commit()
    return customer


def admin_login(session: Session, throttle: LoginThrottle, username: str, password: str, client: str) -> Admin:
    key = f'admin:{username.strip().lower()}|{client}'
    _check_throttle(throttle, key)
    admin = session.get(Admin, username.strip().lower())
    if not admin or not security.verify_password(admin.password_hash, password):
        throttle.record_failure(key)
        raise Unauthorized('That username and password don’t match.')
    throttle.reset(key)
    return admin


def ensure_admin(session: Session, username: str, password: str) -> bool:
    """Makes the admin login if there is none with this username. Never changes an existing one. The caller
    commits. Returns whether it was made."""
    username = username.strip().lower()
    if session.get(Admin, username):
        return False
    session.add(Admin(username=username, password_hash=security.hash_password(password)))
    return True


def list_customers(session: Session) -> Sequence[dict]:
    """Every customer, newest first, with their paid orders' count and total."""
    from app.modules.orders.models import PAID_STATUSES, Order

    paid = (
        select(Order.customer_id, func.count().label('orders'), func.coalesce(func.sum(Order.total), 0).label('spent'))
        .where(Order.status.in_(PAID_STATUSES))
        .group_by(Order.customer_id)
        .subquery()
    )
    rows = session.execute(
        select(Customer, paid.c.orders, paid.c.spent)
        .outerjoin(paid, paid.c.customer_id == Customer.id)
        .order_by(Customer.created_at.desc())
    )
    return [
        {
            'id': c.id,
            'name': c.name,
            'email': c.email,
            'phone': c.phone,
            'created_at': c.created_at,
            'orders': orders or 0,
            'spent': float(spent or 0),
        }
        for c, orders, spent in rows
    ]
