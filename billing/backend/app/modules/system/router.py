from fastapi import APIRouter

from app.core.dependencies import DbSession
from app.core.errors import ServiceUnavailable
from app.core.schemas import ApiModel

from . import repository

router = APIRouter(tags=['system'])


class HealthOut(ApiModel):
    ok: bool


@router.get('/health', responses={503: {'description': 'The database cannot be reached'}})
def health(session: DbSession) -> HealthOut:
    """Is the API up, and can it reach the database?"""
    if not repository.database_reachable(session):
        raise ServiceUnavailable()
    return HealthOut(ok=True)
