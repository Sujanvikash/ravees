from fastapi import APIRouter, status

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import service
from .schemas import QuoteIn, QuoteOut

router = APIRouter(prefix='/quotes', tags=['quotes'])


@router.get('')
def list_quotes(user: CurrentUser, session: DbSession, location: str | None = None) -> list[QuoteOut]:
    """Quotations, oldest first: a showroom's own, or for the admin every showroom's (or one)."""
    return [QuoteOut.from_model(q) for q in service.list_quotes(session, user, location)]


@router.post('', status_code=status.HTTP_201_CREATED)
def create_quote(body: QuoteIn, user: CurrentUser, session: DbSession) -> QuoteOut:
    """A showroom saves a quotation. It never touches stock or the sales figures."""
    return QuoteOut.from_model(service.create_quote(session, user, body))
