"""
The errors services raise, and how they reach the client: always as {"detail": "<a readable sentence>"}, the
same shape FastAPI uses for its own errors, which the billing frontend shows as it is (src/lib/api.js).
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """A failure the user should be told about. Subclasses set the HTTP status and a default message."""

    status_code: int = 400
    default_message: str = 'That request could not be completed.'

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)

    @property
    def headers(self) -> dict[str, str] | None:
        return None


class InvalidInput(AppError):
    status_code = 422
    default_message = 'Some of the details are not right.'


class Unauthorized(AppError):
    status_code = 401
    default_message = 'Sign in again.'

    @property
    def headers(self) -> dict[str, str]:
        return {'WWW-Authenticate': 'Bearer'}


class Forbidden(AppError):
    status_code = 403
    default_message = 'Only the admin can do this.'


class NotFound(AppError):
    status_code = 404
    default_message = 'Not found.'


class Conflict(AppError):
    status_code = 409
    default_message = 'That clashes with something already saved.'


class TooManyRequests(AppError):
    status_code = 429
    default_message = 'Too many attempts. Try again later.'

    def __init__(self, message: str | None = None, *, retry_after: int) -> None:
        super().__init__(message)
        self.retry_after = retry_after

    @property
    def headers(self) -> dict[str, str]:
        return {'Retry-After': str(self.retry_after)}


class ServiceUnavailable(AppError):
    status_code = 503
    default_message = 'The billing server can’t reach its database.'


async def _app_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return JSONResponse({'detail': exc.message}, status_code=exc.status_code, headers=exc.headers)


def register_exception_handlers(app: FastAPI) -> None:
    """Turns every AppError into its status and {"detail": message}."""
    app.add_exception_handler(AppError, _app_error_handler)
