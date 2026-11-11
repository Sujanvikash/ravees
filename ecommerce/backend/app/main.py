"""
The FastAPI app. Run it with: uv run uvicorn app.main:app --reload --port 8001

Every feature's routes live under the API prefix (/api/v1); /health stays at the root for monitoring. The
interactive docs (/docs) are served except when ENVIRONMENT=production.
"""

import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app import db_models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import Settings, get_settings
from app.core.database import get_engine
from app.core.errors import ServiceUnavailable, register_exception_handlers
from app.modules.accounts.router import admin_router as accounts_admin_router
from app.modules.accounts.router import router as auth_router
from app.modules.catalogue.router import admin_router as catalogue_admin_router
from app.modules.catalogue.router import router as catalogue_router
from app.modules.enquiries.router import admin_router as enquiries_admin_router
from app.modules.enquiries.router import router as enquiries_router
from app.modules.orders.router import admin_router as orders_admin_router
from app.modules.orders.router import payments_router
from app.modules.orders.router import router as orders_router
from app.modules.site.router import admin_router as site_admin_router
from app.modules.site.router import router as site_router

API_TITLE = "Raave's Evergreen shop API"
API_VERSION = '1.0.0'

logging.basicConfig(level=logging.INFO, format='%(levelname)s %(name)s: %(message)s')


def _operation_id(route: APIRoute) -> str:
    """Stable OpenAPI operation ids such as catalogue-photo, for generated clients."""
    return f'{route.tags[0]}-{route.name}' if route.tags else route.name


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    public_docs = settings.environment != 'production'  # /docs, /redoc and /openapi.json
    app = FastAPI(
        title=API_TITLE,
        version=API_VERSION,
        generate_unique_id_function=_operation_id,
        docs_url='/docs' if public_docs else None,
        redoc_url='/redoc' if public_docs else None,
        openapi_url='/openapi.json' if public_docs else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allow_headers=['Authorization', 'Content-Type'],
    )
    register_exception_handlers(app)

    api = APIRouter(prefix=settings.api_prefix)
    for router in (
        site_router,
        catalogue_router,
        auth_router,
        enquiries_router,
        orders_router,
        payments_router,
        accounts_admin_router,
        catalogue_admin_router,
        site_admin_router,
        enquiries_admin_router,
        orders_admin_router,
    ):
        api.include_router(router)
    app.include_router(api)

    @app.get('/health', tags=['system'])
    def health() -> dict:
        """Up, and the database answers."""
        try:
            with get_engine().connect() as connection:
                connection.execute(text('SELECT 1'))
        except OperationalError as error:
            raise ServiceUnavailable() from error
        return {'status': 'ok'}

    return app


app = create_app()
