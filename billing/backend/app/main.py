"""
The FastAPI app. Run it with: uv run uvicorn app.main:app --reload --port 8000

Every feature's routes live under the API prefix (/api/v1); /health stays at the root for monitoring. The
interactive docs (/docs) are served except when ENVIRONMENT=production.
"""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app import db_models  # noqa: F401  (registers every table on Base.metadata)
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.modules.auth.router import router as auth_router
from app.modules.cash.router import router as cash_router
from app.modules.demo.router import router as demo_router
from app.modules.orders.router import router as orders_router
from app.modules.products.router import router as products_router
from app.modules.quotes.router import router as quotes_router
from app.modules.reports.router import router as reports_router
from app.modules.returns.router import router as returns_router
from app.modules.sales.router import router as sales_router
from app.modules.stock.router import router as stock_router
from app.modules.system.router import router as system_router
from app.modules.system.router import settings_router
from app.modules.transfers.router import router as transfers_router
from app.modules.users.router import router as users_router

API_TITLE = "Raave's Evergreen billing API"
API_VERSION = '1.0.0'


def _operation_id(route: APIRoute) -> str:
    """Stable OpenAPI operation ids such as products-list_products, for generated clients."""
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
        expose_headers=['Content-Disposition'],  # the file name of a downloaded report
    )
    register_exception_handlers(app)

    api = APIRouter(prefix=settings.api_prefix)
    routers = (
        auth_router,
        users_router,
        products_router,
        sales_router,
        returns_router,
        stock_router,
        transfers_router,
        orders_router,
        quotes_router,
        cash_router,
        reports_router,
        settings_router,
        demo_router,
    )
    for router in routers:
        api.include_router(router)
    app.include_router(api)
    app.include_router(system_router)
    return app


app = create_app()
