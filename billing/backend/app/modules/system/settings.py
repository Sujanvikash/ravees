"""
The settings behind Settings in the app, split into two kinds:

  Appearance (per showroom) — theme, wash, effect, snow, strip, font. Each showroom sets its own
    look for its own screen; the admin sets the defaults (also used on the sign-in screen, before anyone is in).
  Business (global, admin only) — whether showrooms may print quotations, whether GST is shown at all, and
    whether a bill needs the customer's name / mobile.

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
APPEARANCE = frozenset({'theme', 'wash', 'effect', 'snow', 'strip', 'font', 'lang'})
STORE = frozenset({'store_name', 'store_address', 'store_phone', 'gstin', 'composition'})
SELF_EDITABLE = APPEARANCE | STORE
# the admin's own business on an invoice: bank details among them, so only the admin ever sees them
BUSINESS = frozenset(
    {
        'biz_name',
        'biz_address',
        'biz_state',
        'biz_phone',
        'biz_email',
        'biz_gstin',
        'biz_pan',
        'bank_name',
        'bank_account',
        'bank_ifsc',
        'invoice_terms',
    }
)


class AppSettingsOut(ApiModel):
    quote_print: bool = True
    theme: Literal['classic', 'light', 'dark'] = 'classic'
    wash: Literal['light', 'lighter', 'lightest'] = 'lighter'
    effect: Literal['none', 'snow', 'glow', 'both'] = 'none'
    snow: Literal['light', 'medium', 'heavy', 'blizzard'] = 'light'
    strip: Literal['green', 'white'] = 'green'
    # a per-screen text-size preset (applied as a UI zoom); 'normal' is the original size
    font: Literal['normal', 'large', 'larger'] = 'normal'
    # the script the app's words are shown in: 'en' English, 'ta' the same words transliterated into Tamil
    lang: Literal['en', 'ta'] = 'en'

    # The showroom's own details on its bill (each franchise fills in its own). A composition dealer bills a
    # "Bill of Supply" with no GST shown (the price already includes it); only purchase orders and returns carry
    # GST. address may hold several lines (newline-separated). The foot of the bill is a fixed note (frontend).
    store_name: str = Field(default='', max_length=80)
    store_address: str = Field(default='', max_length=300)
    store_phone: str = Field(default='', max_length=80)
    gstin: str = Field(default='', max_length=20)
    # every showroom is a composition dealer (a Bill of Supply, GST included and not shown on the customer bill)
    composition: bool = True

    # The admin's own business, the seller on an invoice (admin only; not a showroom's to set). The
    # address may hold several lines. An invoice is always a tax invoice: each product's cost price with its GST
    # on top (CGST + SGST within the state, IGST across states).
    biz_name: str = Field(default='', max_length=80)
    biz_address: str = Field(default='', max_length=300)
    biz_state: str = Field(default='', max_length=40)
    biz_phone: str = Field(default='', max_length=80)
    biz_email: str = Field(default='', max_length=80)
    biz_gstin: str = Field(default='', max_length=20)
    biz_pan: str = Field(default='', max_length=12)
    bank_name: str = Field(default='', max_length=80)
    bank_account: str = Field(default='', max_length=30)
    bank_ifsc: str = Field(default='', max_length=16)
    invoice_terms: str = Field(default='', max_length=400)

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
    strip: Literal['green', 'white'] | None = None
    font: Literal['normal', 'large', 'larger'] | None = None
    lang: Literal['en', 'ta'] | None = None
    store_name: str | None = Field(default=None, max_length=80)
    store_address: str | None = Field(default=None, max_length=300)
    store_phone: str | None = Field(default=None, max_length=80)
    gstin: str | None = Field(default=None, max_length=20)
    composition: bool | None = None
    biz_name: str | None = Field(default=None, max_length=80)
    biz_address: str | None = Field(default=None, max_length=300)
    biz_state: str | None = Field(default=None, max_length=40)
    biz_phone: str | None = Field(default=None, max_length=80)
    biz_email: str | None = Field(default=None, max_length=80)
    biz_gstin: str | None = Field(default=None, max_length=20)
    biz_pan: str | None = Field(default=None, max_length=12)
    bank_name: str | None = Field(default=None, max_length=80)
    bank_account: str | None = Field(default=None, max_length=30)
    bank_ifsc: str | None = Field(default=None, max_length=16)
    invoice_terms: str | None = Field(default=None, max_length=400)
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


def without_business(values: AppSettingsOut) -> AppSettingsOut:
    """The settings with the admin's business details blanked, for everyone but the admin (and the sign-in screen)."""
    blank = AppSettingsOut()
    return values.model_copy(update={name: getattr(blank, name) for name in BUSINESS})


def _save_overrides(session: Session, location: str, changes: dict) -> AppSettingsOut:
    overrides = _load(session, _loc_key(location))
    overrides.update(changes)
    repository.set_value(session, _loc_key(location), json.dumps(overrides))
    session.commit()
    return get(session, location)


def update(session: Session, patch: AppSettingsPatch, *, user: User, location: str | None = None) -> AppSettingsOut:
    """The admin changes the global settings (business switches and the appearance/bill-detail defaults), or —
    with a `location` — a particular showroom's own appearance and bill details. A showroom changes only its
    own; a business switch from a showroom, or anything but a showroom's own fields, is refused."""
    changes = patch.model_dump(exclude_none=True, by_alias=False)
    if user.is_admin and location:
        if any(name not in SELF_EDITABLE for name in changes):
            raise Forbidden('Only a showroom’s own appearance and bill details can be set per store.')
        return _save_overrides(session, location, changes)
    if user.is_admin or not user.location_id:
        current = _load(session, KEY)
        current.update(changes)
        repository.set_value(session, KEY, json.dumps(current))
        session.commit()
        return get(session)
    if any(name not in SELF_EDITABLE for name in changes):
        raise Forbidden('Only the admin can change these settings.')
    return _save_overrides(session, user.location_id, changes)
