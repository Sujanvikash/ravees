from fastapi import APIRouter

from app.core.database import is_demo
from app.core.dependencies import DbSession
from app.core.errors import Forbidden
from app.modules.auth.dependencies import AdminUser

from . import builder

router = APIRouter(prefix='/demo', tags=['demo'])


@router.post('/reset')
def reset_demo(_: AdminUser, session: DbSession) -> dict[str, str]:
    """Demo admin only: throws the demo's data away and builds a fresh month of samples. Takes a few seconds."""
    if not is_demo(session):
        raise Forbidden('Only the demo can be reset, from a demo sign-in.')
    session.close()  # let go of the demo tables before they are dropped
    return {'detail': str(builder.build_demo())}
