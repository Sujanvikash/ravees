from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import AdminUser

from . import service
from .schemas import CreateStoreIn, LocationOut, RemoveResult

router = APIRouter(prefix='/locations', tags=['locations'])


@router.get('')
def list_stores(session: DbSession) -> list[LocationOut]:
    """Every store, for the sign-in screen and the pickers. Public: the store names aren't secret (they are the
    showrooms on the website) and the sign-in screen needs them before anyone has a token."""
    return [LocationOut.from_model(s) for s in service.list_stores(session)]


@router.post('')
def create_store(body: CreateStoreIn, _: AdminUser, session: DbSession) -> LocationOut:
    """Admin: adds a store (city, area and a unique prefix) and its login (username = prefix, default password)."""
    return LocationOut.from_model(service.create_store(session, body.city, body.area, body.prefix))


@router.delete('/{location_id}')
def remove_store(location_id: str, _: AdminUser, session: DbSession) -> RemoveResult:
    """Admin: removes a store. Deleted if it is empty; otherwise deactivated and kept for its history."""
    deleted, store = service.remove_store(session, location_id)
    return RemoveResult(deleted=deleted, store=LocationOut.from_model(store) if store else None)


@router.post('/{location_id}/reactivate')
def reactivate(location_id: str, _: AdminUser, session: DbSession) -> LocationOut:
    """Admin: brings a deactivated store back onto the sign-in screen and the pickers."""
    return LocationOut.from_model(service.reactivate(session, location_id))
