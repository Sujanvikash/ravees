from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.core.dependencies import AppSettings, DbSession
from app.core.throttling import LoginThrottle, get_login_throttle

from . import service
from .dependencies import CurrentAdmin, CurrentCustomer, client_address
from .schemas import (
    AdminLoginIn,
    AdminOut,
    AdminSessionOut,
    ChangePasswordIn,
    CustomerOut,
    CustomerSummaryOut,
    ForgotPasswordIn,
    LoginIn,
    ProfileIn,
    ResetPasswordIn,
    SessionOut,
    SignupIn,
    TokenOut,
)

Throttle = Annotated[LoginThrottle, Depends(get_login_throttle)]

router = APIRouter(prefix='/auth', tags=['auth'])
admin_router = APIRouter(prefix='/admin', tags=['admin'])


def _session_out(customer, settings) -> SessionOut:
    return SessionOut(
        token=service.customer_token(customer, settings),
        customer=CustomerOut.model_validate(customer, from_attributes=True),
    )


@router.post('/signup', status_code=201)
def signup(body: SignupIn, session: DbSession, settings: AppSettings) -> SessionOut:
    return _session_out(service.signup(session, body), settings)


@router.post('/login')
def login(body: LoginIn, request: Request, session: DbSession, settings: AppSettings, throttle: Throttle) -> SessionOut:
    customer = service.login(session, throttle, body.email, body.password, client_address(request))
    return _session_out(customer, settings)


@router.get('/me')
def me(customer: CurrentCustomer) -> CustomerOut:
    return CustomerOut.model_validate(customer, from_attributes=True)


@router.patch('/me')
def update_me(body: ProfileIn, customer: CurrentCustomer, session: DbSession) -> CustomerOut:
    return CustomerOut.model_validate(
        service.update_profile(session, customer, body.name, body.phone), from_attributes=True
    )


@router.post('/change-password')
def change_password(
    body: ChangePasswordIn, customer: CurrentCustomer, session: DbSession, settings: AppSettings
) -> TokenOut:
    service.change_password(session, customer, body.current, body.password)
    return TokenOut(token=service.customer_token(customer, settings))


@router.post('/forgot-password', status_code=204)
def forgot_password(body: ForgotPasswordIn, session: DbSession, settings: AppSettings) -> Response:
    service.forgot_password(session, body.email, settings)
    return Response(status_code=204)


@router.post('/reset-password')
def reset_password(body: ResetPasswordIn, session: DbSession, settings: AppSettings) -> SessionOut:
    return _session_out(service.reset_password(session, body.token, body.password), settings)


@admin_router.post('/login')
def admin_login(
    body: AdminLoginIn, request: Request, session: DbSession, settings: AppSettings, throttle: Throttle
) -> AdminSessionOut:
    admin = service.admin_login(session, throttle, body.username, body.password, client_address(request))
    return AdminSessionOut(token=service.admin_token(admin, settings), admin=AdminOut(username=admin.username))


@admin_router.get('/me')
def admin_me(admin: CurrentAdmin) -> AdminOut:
    return AdminOut(username=admin.username)


@admin_router.post('/change-password')
def admin_change_password(
    body: ChangePasswordIn, admin: CurrentAdmin, session: DbSession, settings: AppSettings
) -> TokenOut:
    service.change_password(session, admin, body.current, body.password)
    return TokenOut(token=service.admin_token(admin, settings))


@admin_router.get('/customers')
def list_customers(_: CurrentAdmin, session: DbSession) -> list[CustomerSummaryOut]:
    return [CustomerSummaryOut.model_validate(c) for c in service.list_customers(session)]
