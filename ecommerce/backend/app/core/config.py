"""
Settings, read from the environment or from ecommerce/backend/.env (see .env.example). Environment variables win
over the file, which is how the tests point the app at their own database.
"""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

MIN_JWT_SECRET = 32


class Settings(BaseSettings):
    """Everything the API can be configured with. Only DATABASE_URL and JWT_SECRET have no default."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / '.env', env_file_encoding='utf-8', extra='ignore', hide_input_in_errors=True
    )

    environment: Literal['development', 'test', 'production'] = 'development'
    api_prefix: str = '/api/v1'

    database_url: str
    jwt_secret: SecretStr
    customer_token_days: int = Field(default=30, ge=1, le=365)
    admin_token_hours: int = Field(default=12, ge=1, le=24 * 7)

    # the website's address(es); comma-separated in .env
    cors_origins: Annotated[list[str], NoDecode] = ['http://localhost:5173']
    # this API's own public address, for photo links; the website's, for links in emails
    public_url: str = 'http://localhost:8001'
    site_url: str = 'http://localhost:5173'

    # wrong passwords allowed per email and computer before sign-in is paused
    login_max_failures: int = Field(default=10, ge=1)
    login_window_minutes: int = Field(default=15, ge=1)
    reset_link_minutes: int = Field(default=30, ge=5, le=24 * 60)

    # email through a mailbox's SMTP server (the shop's Zoho mailbox: smtp.zoho.in, 465) or else through Resend;
    # with neither, emails are written to the log instead
    smtp_host: str = ''
    smtp_port: int = 465
    smtp_user: str = ''
    smtp_password: SecretStr = SecretStr('')
    resend_api_key: SecretStr = SecretStr('')
    mail_from: str = "Raave's Evergreen <onboarding@resend.dev>"
    # where a customer's reply to an email goes (the shop's own inbox); empty: back to mail_from
    mail_reply_to: str = ''
    admin_email: str = ''

    # Razorpay; without keys, online payment is switched off
    razorpay_key_id: str = ''
    razorpay_key_secret: SecretStr = SecretStr('')
    razorpay_webhook_secret: SecretStr = SecretStr('')

    # the admin login `python -m app.cli seed` makes when there is none
    admin_username: str = 'admin'
    admin_password: SecretStr = SecretStr('')

    @field_validator('jwt_secret')
    @classmethod
    def _long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < MIN_JWT_SECRET:
            raise ValueError(
                f'JWT_SECRET must be at least {MIN_JWT_SECRET} characters. Generate one with: '
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return value

    @field_validator('cors_origins', mode='before')
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(',') if origin.strip()]
        return value

    @field_validator('api_prefix')
    @classmethod
    def _clean_prefix(cls, value: str) -> str:
        value = value.strip().rstrip('/')
        return value if not value or value.startswith('/') else f'/{value}'

    @field_validator('public_url', 'site_url')
    @classmethod
    def _no_trailing_slash(cls, value: str) -> str:
        return value.strip().rstrip('/')

    @property
    def payments_enabled(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret.get_secret_value())


@lru_cache
def get_settings() -> Settings:
    """The settings, read once per process."""
    return Settings()
