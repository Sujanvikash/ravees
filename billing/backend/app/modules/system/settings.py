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
ADMIN_KEY = 'admin'  # the admin's own appearance lives under ui:admin, so it doesn't change everyone's

# A showroom (and the admin, for its own screen) may change only APPEARANCE. The STORE details printed on the
# bill, the language, and the business switches are admin-only; the admin sets a showroom's STORE details per
# location. Both APPEARANCE and STORE are laid over the global defaults for a location (OVERLAY), so a showroom
# still *sees* (and prints) the details the admin set for it, even though it can't change them.
APPEARANCE = frozenset({'theme', 'wash', 'effect', 'snow', 'effect_where', 'strip', 'nav', 'font'})
STORE = frozenset({'store_name', 'store_address', 'store_phone', 'gstin', 'bill_footer', 'composition'})
OVERLAY = APPEARANCE | STORE


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
    # every showroom is a composition dealer (a Bill of Supply, GST included and not shown on the customer bill)
    composition: bool = True

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
        for name in OVERLAY:
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


def _save_overrides(session: Session, location: str, changes: dict) -> AppSettingsOut:
    overrides = _load(session, _loc_key(location))
    overrides.update(changes)
    repository.set_value(session, _loc_key(location), json.dumps(overrides))
    session.commit()
    return get(session, location)


def update(session: Session, patch: AppSettingsPatch, *, user: User, location: str | None = None) -> AppSettingsOut:
    """Who may change what:
    - a showroom: only its own appearance and bill details (saved under its location);
    - the admin with a `location`: that showroom's own appearance and bill details;
    - the admin with no location: its own appearance (saved under ui:admin, so it doesn't change everyone's),
      and the global switches — the business settings and the language — which do apply to everyone.
    """
    changes = patch.model_dump(exclude_none=True, by_alias=False)
    if user.is_admin and location:
        if any(name not in OVERLAY for name in changes):
            raise Forbidden('Only a showroom’s own appearance and bill details can be set per store.')
        return _save_overrides(session, location, changes)
    if not user.is_admin:
        if any(name not in APPEARANCE for name in changes):
            raise Forbidden('Only the admin can change these settings.')
        return _save_overrides(session, user.location_id, changes)
    # the admin, no location: its own appearance goes to ui:admin, the rest (business + language) is global
    if any(name in STORE for name in changes):
        raise Forbidden('Pick a showroom to set its bill details.')
    personal = {name: value for name, value in changes.items() if name in APPEARANCE}
    global_ = {name: value for name, value in changes.items() if name not in APPEARANCE}
    if personal:
        overrides = _load(session, _loc_key(ADMIN_KEY))
        overrides.update(personal)
        repository.set_value(session, _loc_key(ADMIN_KEY), json.dumps(overrides))
    if global_:
        current = _load(session, KEY)
        current.update(global_)
        repository.set_value(session, KEY, json.dumps(current))
    session.commit()
    return get(session, ADMIN_KEY)
