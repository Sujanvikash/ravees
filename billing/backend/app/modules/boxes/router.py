import uuid

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import BoxesIn, BoxOut, BoxReceiveIn, BoxTagIn

router = APIRouter(prefix='/boxes', tags=['boxes'])


@router.get('')
def list_boxes(user: CurrentUser, session: DbSession, location: str | None = None) -> list[BoxOut]:
    """Packed boxes sent on to the showrooms, oldest first: a showroom's own, or for the admin every one."""
    return [BoxOut.from_model(b) for b in service.list_boxes(session, user, location)]


@router.post('', responses={409: {'description': 'A box number already used, or a box already received'}})
def save_boxes(body: BoxesIn, user: CurrentUser, session: DbSession) -> list[BoxOut]:
    """Admin: adds boxes with what is in each (one, or many from a packing list), or edits packed ones (same id).
    All are saved or none."""
    return [BoxOut.from_model(b) for b in service.save_boxes(session, user, body)]


@router.post('/tag', responses={409: {'description': 'A box already received'}})
def tag_boxes(body: BoxTagIn, user: CurrentUser, session: DbSession) -> list[BoxOut]:
    """Admin: tags packed boxes for the showroom they go to (null takes the tag off)."""
    return [BoxOut.from_model(b) for b in service.tag(session, user, body)]


@router.delete('/{box_id}', status_code=status.HTTP_204_NO_CONTENT, responses={409: {'description': 'Received'}})
def delete_box(box_id: uuid.UUID, user: CurrentUser, session: DbSession) -> None:
    """Admin: removes a packed box entered by mistake."""
    service.delete(session, user, box_id)


@router.post('/{box_id}/receive', responses={409: {'description': 'Already received'}})
def receive_box(box_id: uuid.UUID, body: BoxReceiveIn, user: CurrentUser, session: DbSession) -> BoxOut:
    """The showroom counts a box in; what it counts is added to its stock."""
    return BoxOut.from_model(service.receive(session, user, box_id, body))
