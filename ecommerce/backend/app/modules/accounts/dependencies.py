"""Who is asking: the signed-in customer or the admin, from the request's bearer token."""

from typing import Annotated

from fastapi import Depends, Request

from app.core.dependencies import AppSettings, DbSession
from app.core.errors import Unauthorized

from . import service
from .models import Admin, Customer


def bearer_token(request: Request) -> str | None:
    scheme, _, token = request.headers.get('Authorization', '').partition(' ')
    return token.strip() or None if scheme.lower() == 'bearer' else None


def client_address(request: Request) -> str:
    """The caller's address (the proxy in front passes on the real one), for the wrong-password brake."""
    return request.client.host if request.client else 'unknown'


def _current_customer(request: Request, session: DbSession, settings: AppSettings) -> Customer:
    token = bearer_token(request)
    if not token:
        raise Unauthorized('Please sign in.')
    return service.customer_from_token(session, token, settings)


def _optional_customer(request: Request, session: DbSession, settings: AppSettings) -> Customer | None:
    """The signed-in customer, or None when the request comes without a token or with a stale one."""
    token = bearer_token(request)
    if not token:
        return None
    try:
        return service.customer_from_token(session, token, settings)
    except Unauthorized:
        return None


def _current_admin(request: Request, session: DbSession, settings: AppSettings) -> Admin:
    token = bearer_token(request)
    if not token:
        raise Unauthorized('Please sign in as the admin.')
    return service.admin_from_token(session, token, settings)


CurrentCustomer = Annotated[Customer, Depends(_current_customer)]
OptionalCustomer = Annotated[Customer | None, Depends(_optional_customer)]
CurrentAdmin = Annotated[Admin, Depends(_current_admin)]
