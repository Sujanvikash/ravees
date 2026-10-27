"""
Dates as the showrooms see them. Every showroom is in India, on IST (UTC+5:30, no daylight saving), so a fixed
offset is enough and no time-zone database is needed. Times are stored in UTC.
"""

from datetime import UTC, datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), 'IST')


def now() -> datetime:
    return datetime.now(UTC)


def financial_year(at: datetime) -> str:
    """The Indian financial year (April to March) a moment falls in, as "26-27"."""
    local = at.astimezone(IST)
    start = local.year if local.month >= 4 else local.year - 1
    return f'{start % 100:02d}-{(start + 1) % 100:02d}'
