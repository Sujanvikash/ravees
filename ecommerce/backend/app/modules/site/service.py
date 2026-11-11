"""Showrooms, testimonials and the shop's settings (delivery charges), all edited by the admin."""

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFound

from .models import ShopSetting, Showroom, Testimonial
from .schemas import ShopSettings, ShopSettingsPatch, ShowroomIn, ShowroomPatch, TestimonialIn, TestimonialPatch

SHOWROOM_TEXT = ('city', 'title', 'address', 'phone', 'timing', 'map_query')
TESTIMONIAL_TEXT = ('author', 'location', 'quote', 'tree_model')


def showrooms(session: Session) -> Sequence[Showroom]:
    return session.scalars(select(Showroom).order_by(Showroom.position, Showroom.city)).all()


def testimonials(session: Session) -> Sequence[Testimonial]:
    return session.scalars(select(Testimonial).order_by(Testimonial.position, Testimonial.author)).all()


def _get(session: Session, model: type[Showroom] | type[Testimonial], item_id: str) -> Showroom | Testimonial:
    try:
        item = session.get(model, uuid.UUID(item_id))
    except ValueError:
        item = None
    if not item:
        raise NotFound(f'No such {model.__name__.lower()}.')
    return item


def _next_position(session: Session, model: type[Showroom] | type[Testimonial]) -> int:
    return (session.scalar(select(func.max(model.position))) or 0) + 1


def _apply(item: Showroom | Testimonial, changes: dict, text_fields: tuple[str, ...]) -> None:
    for field, value in changes.items():
        if value is None:
            continue
        if field in text_fields:
            value = value.strip()
        elif field == 'features':
            value = [f.strip() for f in value if f.strip()]
        elif field == 'stores':
            value = [{k: v.strip() for k, v in store.items()} for store in value]
        setattr(item, field, value)


def save_showroom(session: Session, data: ShowroomPatch | ShowroomIn, showroom_id: str | None = None) -> Showroom:
    """Adds a showroom (no id) or changes one. Only one showroom is the flagship at a time."""
    if showroom_id:
        showroom = _get(session, Showroom, showroom_id)
    else:
        showroom = Showroom(
            title='', address='', phone='', timing='', features=[], map_query='', stores=[], is_flagship=False
        )
        showroom.position = _next_position(session, Showroom)
        session.add(showroom)
    _apply(showroom, data.model_dump(by_alias=False, exclude_unset=True), SHOWROOM_TEXT)
    if showroom.is_flagship:
        for other in showrooms(session):
            if other is not showroom:
                other.is_flagship = False
    session.commit()
    return showroom


def save_testimonial(
    session: Session, data: TestimonialPatch | TestimonialIn, testimonial_id: str | None = None
) -> Testimonial:
    if testimonial_id:
        testimonial = _get(session, Testimonial, testimonial_id)
    else:
        testimonial = Testimonial(location='', rating=5, tree_model='', position=_next_position(session, Testimonial))
        session.add(testimonial)
    _apply(testimonial, data.model_dump(by_alias=False, exclude_unset=True), TESTIMONIAL_TEXT)
    session.commit()
    return testimonial


def delete(session: Session, model: type[Showroom] | type[Testimonial], item_id: str) -> None:
    session.delete(_get(session, model, item_id))
    session.commit()


def get_settings(session: Session) -> ShopSettings:
    saved = {row.key: row.value for row in session.scalars(select(ShopSetting))}
    return ShopSettings.model_validate({k: v for k, v in saved.items() if k in ShopSettings.model_fields})


def update_settings(session: Session, data: ShopSettingsPatch) -> ShopSettings:
    for key, value in data.model_dump(by_alias=False, exclude_unset=True, exclude_none=True).items():
        row = session.get(ShopSetting, key)
        if row:
            row.value = value
        else:
            session.add(ShopSetting(key=key, value=value))
    session.commit()
    return get_settings(session)
