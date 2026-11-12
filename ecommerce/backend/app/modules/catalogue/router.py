from typing import Annotated, Literal

from fastapi import APIRouter, File, Response, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.core.dependencies import DbSession
from app.modules.accounts.dependencies import CurrentAdmin

from . import images, service
from .images import MAX_UPLOAD_BYTES
from .models import Category, Product
from .schemas import (
    AdminCatalogueOut,
    AdminCategoryOut,
    AdminProductOut,
    CategoryIn,
    CategoryPatch,
    ImageOut,
    OrderIdsIn,
    ProductIn,
    ProductPatch,
)

router = APIRouter(tags=['catalogue'])
admin_router = APIRouter(prefix='/admin', tags=['admin'])

YEAR = 365 * 24 * 3600


@router.get('/media/{image_id}.webp')
def photo(image_id: str, session: DbSession, size: Literal['large', 'card'] = 'large') -> Response:
    """A photo. Its id never points at anything else, so browsers may keep it for a year."""
    return Response(
        service.image_bytes(session, image_id, size),
        media_type='image/webp',
        headers={'Cache-Control': f'public, max-age={YEAR}, immutable'},
    )


@router.get('/media/{image_id}.jpg')
def email_photo(image_id: str, session: DbSession) -> Response:
    """A photo as a small square JPEG, for the order emails (mail apps don't all show WebP)."""
    return Response(
        images.email_thumb(service.image_bytes(session, image_id, 'card')),
        media_type='image/jpeg',
        headers={'Cache-Control': f'public, max-age={YEAR}, immutable'},
    )


@admin_router.get('/catalogue')
def catalogue(_: CurrentAdmin, session: DbSession) -> AdminCatalogueOut:
    return AdminCatalogueOut.model_validate(service.admin_catalogue(session))


@admin_router.post('/categories', status_code=201)
def create_category(body: CategoryIn, _: CurrentAdmin, session: DbSession) -> AdminCategoryOut:
    return AdminCategoryOut.model_validate(service.create_category(session, body))


@admin_router.put('/categories/order', status_code=204)
def order_categories(body: OrderIdsIn, _: CurrentAdmin, session: DbSession) -> Response:
    service.reorder(session, Category, body.ids)
    return Response(status_code=204)


@admin_router.patch('/categories/{category_id}')
def update_category(category_id: str, body: CategoryPatch, _: CurrentAdmin, session: DbSession) -> AdminCategoryOut:
    return AdminCategoryOut.model_validate(service.update_category(session, category_id, body))


@admin_router.delete('/categories/{category_id}', status_code=204)
def delete_category(category_id: str, _: CurrentAdmin, session: DbSession) -> Response:
    service.delete_category(session, category_id)
    return Response(status_code=204)


@admin_router.post('/products', status_code=201)
def create_product(body: ProductIn, _: CurrentAdmin, session: DbSession) -> AdminProductOut:
    return AdminProductOut.model_validate(service.create_product(session, body))


@admin_router.put('/products/order', status_code=204)
def order_products(body: OrderIdsIn, _: CurrentAdmin, session: DbSession) -> Response:
    service.reorder(session, Product, body.ids)
    return Response(status_code=204)


@admin_router.patch('/products/{product_id}')
def update_product(product_id: str, body: ProductPatch, _: CurrentAdmin, session: DbSession) -> AdminProductOut:
    return AdminProductOut.model_validate(service.update_product(session, product_id, body))


@admin_router.delete('/products/{product_id}', status_code=204)
def delete_product(product_id: str, _: CurrentAdmin, session: DbSession) -> Response:
    service.delete_product(session, product_id)
    return Response(status_code=204)


@admin_router.post('/images', status_code=201)
async def upload_image(_: CurrentAdmin, session: DbSession, file: Annotated[UploadFile, File()]) -> ImageOut:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    # resizing takes a moment: off the event loop, so other requests go on meanwhile
    return ImageOut.model_validate(await run_in_threadpool(service.save_image, session, data))
