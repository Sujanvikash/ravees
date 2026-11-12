from fastapi import APIRouter, Response

from app.core.config import BACKEND_DIR
from app.core.dependencies import DbSession
from app.modules.accounts.dependencies import CurrentAdmin
from app.modules.catalogue import service as catalogue
from app.modules.catalogue.schemas import OrderIdsIn

from . import service
from .models import Showroom, Testimonial
from .schemas import (
    Seller,
    ShopSettings,
    ShopSettingsPatch,
    ShowroomIn,
    ShowroomOut,
    ShowroomPatch,
    StorefrontOut,
    TestimonialIn,
    TestimonialOut,
    TestimonialPatch,
)

router = APIRouter(tags=['storefront'])
# the logo the emails show: a PNG, since mail apps don't show SVG (made from the website's src/assets/logo.svg)
EMAIL_LOGO = (BACKEND_DIR / 'app' / 'static' / 'email-logo.png').read_bytes()
admin_router = APIRouter(prefix='/admin', tags=['admin'])


@router.get('/storefront')
def storefront(session: DbSession, response: Response) -> StorefrontOut:
    """Everything the website shows, in one answer. Asked afresh every time (the website keeps its own copy to
    show at once), so an admin's change shows on the next page load."""
    response.headers['Cache-Control'] = 'no-cache'
    return StorefrontOut.model_validate(
        {
            **catalogue.storefront(session),
            'showrooms': [ShowroomOut.model_validate(service.showroom_out(s)) for s in service.showrooms(session)],
            'testimonials': [
                TestimonialOut.model_validate(t, from_attributes=True) for t in service.testimonials(session)
            ],
            'settings': service.get_settings(session),
        }
    )


@router.get('/brand/email-logo.png')
def email_logo() -> Response:
    return Response(EMAIL_LOGO, media_type='image/png', headers={'Cache-Control': 'public, max-age=86400'})


@admin_router.get('/showrooms')
def list_showrooms(_: CurrentAdmin, session: DbSession) -> list[ShowroomOut]:
    return [ShowroomOut.model_validate(service.showroom_out(s)) for s in service.showrooms(session)]


@admin_router.post('/showrooms', status_code=201)
def create_showroom(body: ShowroomIn, _: CurrentAdmin, session: DbSession) -> ShowroomOut:
    return ShowroomOut.model_validate(service.showroom_out(service.save_showroom(session, body)))


@admin_router.put('/showrooms/order', status_code=204)
def order_showrooms(body: OrderIdsIn, _: CurrentAdmin, session: DbSession) -> Response:
    catalogue.reorder(session, Showroom, body.ids)
    return Response(status_code=204)


@admin_router.patch('/showrooms/{showroom_id}')
def update_showroom(showroom_id: str, body: ShowroomPatch, _: CurrentAdmin, session: DbSession) -> ShowroomOut:
    return ShowroomOut.model_validate(service.showroom_out(service.save_showroom(session, body, showroom_id)))


@admin_router.delete('/showrooms/{showroom_id}', status_code=204)
def delete_showroom(showroom_id: str, _: CurrentAdmin, session: DbSession) -> Response:
    service.delete(session, Showroom, showroom_id)
    return Response(status_code=204)


@admin_router.get('/testimonials')
def list_testimonials(_: CurrentAdmin, session: DbSession) -> list[TestimonialOut]:
    return [TestimonialOut.model_validate(t, from_attributes=True) for t in service.testimonials(session)]


@admin_router.post('/testimonials', status_code=201)
def create_testimonial(body: TestimonialIn, _: CurrentAdmin, session: DbSession) -> TestimonialOut:
    return TestimonialOut.model_validate(service.save_testimonial(session, body), from_attributes=True)


@admin_router.put('/testimonials/order', status_code=204)
def order_testimonials(body: OrderIdsIn, _: CurrentAdmin, session: DbSession) -> Response:
    catalogue.reorder(session, Testimonial, body.ids)
    return Response(status_code=204)


@admin_router.patch('/testimonials/{testimonial_id}')
def update_testimonial(
    testimonial_id: str, body: TestimonialPatch, _: CurrentAdmin, session: DbSession
) -> TestimonialOut:
    return TestimonialOut.model_validate(service.save_testimonial(session, body, testimonial_id), from_attributes=True)


@admin_router.delete('/testimonials/{testimonial_id}', status_code=204)
def delete_testimonial(testimonial_id: str, _: CurrentAdmin, session: DbSession) -> Response:
    service.delete(session, Testimonial, testimonial_id)
    return Response(status_code=204)


@admin_router.get('/settings')
def get_settings(_: CurrentAdmin, session: DbSession) -> ShopSettings:
    return service.get_settings(session)


@admin_router.patch('/settings')
def update_settings(body: ShopSettingsPatch, _: CurrentAdmin, session: DbSession) -> ShopSettings:
    return service.update_settings(session, body)


@admin_router.get('/settings/invoice')
def get_seller(_: CurrentAdmin, session: DbSession) -> Seller:
    """Who the invoices of online orders are from."""
    return service.get_seller(session)


@admin_router.put('/settings/invoice')
def save_seller(body: Seller, _: CurrentAdmin, session: DbSession) -> Seller:
    """New invoices use these details; invoices already made keep the ones they were made with."""
    return service.save_seller(session, body)
