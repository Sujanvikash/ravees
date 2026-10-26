"""
The five showrooms and the admin login. The billing frontend has the same list (with addresses for receipts) in
src/config.js; keep the ids and bill prefixes in step.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Showroom:
    id: str
    city: str
    area: str
    bill_prefix: str


SHOWROOMS: tuple[Showroom, ...] = (
    Showroom('chennai', 'Chennai', 'Egmore', 'CHN'),
    Showroom('bengaluru', 'Bengaluru', 'Indiranagar', 'BLR'),
    Showroom('goa', 'Goa', 'Panaji', 'GOA'),
    Showroom('mumbai', 'Mumbai', 'Bandra West', 'MUM'),
    Showroom('pune', 'Pune', 'Koregaon Park', 'PUN'),
)

SHOWROOM_IDS: tuple[str, ...] = tuple(s.id for s in SHOWROOMS)

ADMIN_USERNAME = 'admin'

# how logins are listed: the showrooms in the frontend's order, then the admin
LOGIN_ORDER: tuple[str, ...] = (*SHOWROOM_IDS, ADMIN_USERNAME)
