"""
The admin's switches (Settings in the app): appearance, whether showrooms may print quotations, and how long
after a sale its items may be returned or exchanged. Kept as one JSON value in app_settings; anything not saved
yet has its default. The sign-in screen reads them before anyone signs in, so they hold nothing private.
"""

import json
from typing import Literal

from pydantic import ConfigDict
from sqlalchemy.orm import Session

from app.core.schemas import ApiModel

from . import repository

KEY = 'ui'


class AppSettingsOut(ApiModel):
    quote_print: bool = True
    theme: Literal['classic', 'light', 'dark'] = 'classic'
    wash: Literal['light', 'lighter', 'lightest'] = 'lighter'
    effect: Literal['none', 'snow', 'glow', 'both'] = 'none'
    snow: Literal['light', 'medium', 'heavy', 'blizzard'] = 'light'
    effect_where: Literal['everywhere', 'signin'] = 'everywhere'
    strip: Literal['green', 'white'] = 'green'
    nav: Literal['solid', 'soft'] = 'solid'
    # days after a sale its items can be returned or exchanged; 0 turns returns off
    return_days: Literal[0, 7, 15, 30] = 15


class AppSettingsPatch(ApiModel):
    """Only the switches being changed."""

    model_config = ConfigDict(extra='forbid')

    quote_print: bool | None = None
    theme: Literal['classic', 'light', 'dark'] | None = None
    wash: Literal['light', 'lighter', 'lightest'] | None = None
    effect: Literal['none', 'snow', 'glow', 'both'] | None = None
    snow: Literal['light', 'medium', 'heavy', 'blizzard'] | None = None
    effect_where: Literal['everywhere', 'signin'] | None = None
    strip: Literal['green', 'white'] | None = None
    nav: Literal['solid', 'soft'] | None = None
    return_days: Literal[0, 7, 15, 30] | None = None


def get(session: Session) -> AppSettingsOut:
    saved = repository.get_value(session, KEY, '{}')
    try:
        values = json.loads(saved)
    except ValueError:
        values = {}
    # a saved value that is no longer allowed falls back to its default
    defaults = AppSettingsOut()
    clean = {}
    for name in AppSettingsOut.model_fields:
        if name in values:
            try:
                AppSettingsOut(**{name: values[name]})
                clean[name] = values[name]
            except ValueError:
                pass
    return defaults.model_copy(update=clean)


def update(session: Session, patch: AppSettingsPatch) -> AppSettingsOut:
    current = get(session)
    merged = current.model_copy(update=patch.model_dump(exclude_none=True, by_alias=False))
    repository.set_value(session, KEY, json.dumps(merged.model_dump(by_alias=False)))
    session.commit()
    return merged
