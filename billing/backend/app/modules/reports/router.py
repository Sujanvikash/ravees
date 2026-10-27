from datetime import date

from fastapi import APIRouter, Response

from app.core.dependencies import DbSession
from app.modules.auth.dependencies import CurrentUser

from . import sales_excel

router = APIRouter(prefix='/reports', tags=['reports'])

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


@router.get('/sales.xlsx', response_class=Response, responses={200: {'content': {XLSX: {}}}})
def sales_report(
    user: CurrentUser,
    session: DbSession,
    location: str | None = None,
    since: date | None = None,
    until: date | None = None,
) -> Response:
    """The sales report as an Excel workbook (summary, bills, items, returns, cash closes) for the days from
    `since` to `until` (IST, both included). A showroom gets its own; the admin all showrooms or one, with cost
    and profit."""
    content, filename = sales_excel.build(session, user, location=location, since=since, until=until)
    return Response(content, media_type=XLSX, headers={'Content-Disposition': f'attachment; filename="{filename}"'})
