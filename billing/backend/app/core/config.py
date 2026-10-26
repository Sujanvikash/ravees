"""
Settings, read from the environment or from billing/backend/.env (see .env.example). Environment variables win
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
    # how long a login lasts: a counter shift plus margin
    token_hours: int = Field(default=14, ge=1, le=24 * 7)

    # the billing frontend's address(es); comma-separated in .env
    cors_origins: Annotated[list[str], NoDecode] = ['http://localhost:5174']

    # wrong passwords allowed per login and computer before sign-in is paused
    login_max_failures: int = Field(default=10, ge=1)
    login_window_minutes: int = Field(default=15, ge=1)

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


@lru_cache
def get_settings() -> Settings:
    """The settings, read once per process."""
    return Settings()
