"""
The settings behind Settings in the app, split into two kinds:

  Appearance (per showroom) — theme, wash, effect, snow, where, strip, nav, font. Each showroom sets its own
    look for its own screen; the admin sets the defaults (also used on the sign-in screen, before anyone is in).
  Business (global, admin only) — whether showrooms may print quotations, the return window, whether GST is
    shown at all, and whether a bill needs the customer's name / mobile.

Kept as JSON in app_settings: the global defaults under 'ui', each showroom's appearance overrides under
'ui:<location>'. Anything not saved yet has its default. The sign-in screen reads the global ones before anyone
signs in, so they hold nothing private.
"""

import json
from typing import Literal

from pydantic import ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.errors import Forbidden
from app.core.schemas import ApiModel
from app.modules.users.models import User

from . import repository

KEY = 'ui'

# appearance a showroom sets for itself; its own details printed on the bill; everything else is admin-only
APPEARANCE = frozenset({'theme', 'wash', 'effect', 'snow', 'effect_where', 'strip', 'nav', 'font', 'lang'})
STORE = frozenset({'store_name', 'store_address', 'store_phone', 'gstin', 'bill_footer', 'composition'})
SELF_EDITABLE = APPEARANCE | STORE


class AppSettingsOut(ApiModel):
    quote_print: bool = True
    theme: Literal['classic', 'light', 'dark'] = 'classic'
    wash: Literal['light', 'lighter', 'lightest'] = 'lighter'
    effect: Literal['none', 'snow', 'glow', 'both'] = 'none'
    snow: Literal['light', 'medium', 'heavy', 'blizzard'] = 'light'
    effect_where: Literal['everywhere', 'signin'] = 'everywhere'
    strip: Literal['green', 'white'] = 'green'
    nav: Literal['solid', 'soft'] = 'solid'
    # a per-screen text-size preset (applied as a UI zoom); 'normal' is the original size
    font: Literal['normal', 'large', 'larger'] = 'normal'
    # the script the app's words are shown in: 'en' English, 'ta' the same words transliterated into Tamil
    lang: Literal['en', 'ta'] = 'en'

    # The showroom's own details on its bill (each franchise fills in its own). A composition dealer bills a
    # "Bill of Supply" with no GST shown (the price already includes it); only purchase orders and returns carry
    # GST. address / footer may hold several lines (newline-separated).
    store_name: str = Field(default='', max_length=80)
    store_address: str = Field(default='', max_length=300)
    store_phone: str = Field(default='', max_length=80)
    gstin: str = Field(default='', max_length=20)
    bill_footer: str = Field(default='', max_length=200)
    composition: bool = False

    # days after a sale its items can be returned or exchanged; 0 turns returns off
    return_days: Literal[0, 7, 15, 30] = 15
    # off: GST isn't shown anywhere (bills, quotations, figures, the report); prices are the selling price
    show_gst: bool = True
    # whether the counter asks for the customer's name / mobile on a bill (a quotation always needs both)
    require_name: bool = True
    require_mobile: bool = True


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
    font: Literal['normal', 'large', 'larger'] | None = None
    lang: Literal['en', 'ta'] | None = None
    store_name: str | None = Field(default=None, max_length=80)
    store_address: str | None = Field(default=None, max_length=300)
    store_phone: str | None = Field(default=None, max_length=80)
    gstin: str | None = Field(default=None, max_length=20)
    bill_footer: str | None = Field(default=None, max_length=200)
    composition: bool | None = None
    return_days: Literal[0, 7, 15, 30] | None = None
    show_gst: bool | None = None
    require_name: bool | None = None
    require_mobile: bool | None = None


def _loc_key(location: str) -> str:
    return f'{KEY}:{location}'


def _load(session: Session, key: str) -> dict:
    try:
        return json.loads(repository.get_value(session, key, '{}'))
    except ValueError:
        return {}


def get(session: Session, location: str | None = None) -> AppSettingsOut:
    """The settings in force: the global defaults, with `location`'s own appearance overrides laid over them."""
    values = _load(session, KEY)
    if location:
        overrides = _load(session, _loc_key(location))
        for name in SELF_EDITABLE:
            if name in overrides:
                values[name] = overrides[name]
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


def update(session: Session, patch: AppSettingsPatch, *, user: User) -> AppSettingsOut:
    """The admin changes the global settings (business switches and the appearance defaults). A showroom may
    change only its own appearance, saved under its location; a business switch from a showroom is refused."""
    changes = patch.model_dump(exclude_none=True, by_alias=False)
    if user.is_admin or not user.location_id:
        current = _load(session, KEY)
        current.update(changes)
        repository.set_value(session, KEY, json.dumps(current))
        session.commit()
        return get(session)
    if any(name not in SELF_EDITABLE for name in changes):
        raise Forbidden('Only the admin can change these settings.')
    location = user.location_id
    overrides = _load(session, _loc_key(location))
    overrides.update(changes)
    repository.set_value(session, _loc_key(location), json.dumps(overrides))
    session.commit()
    return get(session, location)
