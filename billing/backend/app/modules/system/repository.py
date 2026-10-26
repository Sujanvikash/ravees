from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .models import AppSetting

SEASON = 'season'


def get_value(session: Session, key: str, default: str = '') -> str:
    setting = session.get(AppSetting, key)
    return setting.value if setting else default


def set_value(session: Session, key: str, value: str) -> None:
    setting = session.get(AppSetting, key)
    if setting:
        setting.value = value
    else:
        session.add(AppSetting(key=key, value=value))
    session.flush()


def database_reachable(session: Session) -> bool:
    try:
        session.execute(text('select 1'))
    except SQLAlchemyError:
        return False
    return True
