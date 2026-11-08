import uuid

from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import BoxesIn, BoxOut

router = APIRouter(prefix='/boxes', tags=['boxes'])


@router.get('')
def list_boxes(user: CurrentUser, session: DbSession) -> list[BoxOut]:
    """Admin: the boxes in the warehouse and where the others went, oldest first."""
    return [BoxOut.from_model(b) for b in service.list_boxes(session, user)]


@router.post('', responses={409: {'description': 'A box number already used, or a box already on an invoice'}})
def save_boxes(body: BoxesIn, user: CurrentUser, session: DbSession) -> list[BoxOut]:
    """Admin: adds boxes with what is in each (one, or many from a packing list), or edits ones still in stock
    (same id). The items are added to the warehouse stock. All are saved or none."""
    return [BoxOut.from_model(b) for b in service.save_boxes(session, user, body)]


@router.delete('/{box_id}', status_code=status.HTTP_204_NO_CONTENT, responses={409: {'description': 'On an invoice'}})
def delete_box(box_id: uuid.UUID, user: CurrentUser, session: DbSession) -> None:
    """Admin: removes a box entered by mistake, and its items from the warehouse stock."""
    service.delete(session, user, box_id)
