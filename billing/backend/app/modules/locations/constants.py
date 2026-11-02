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

# The admin's own stock (the warehouse). It is kept as a location so stock, imports and history work the same way,
# but it is not a showroom: no login, no bills, no cash close. Stock sent back by the showrooms goes into it, and
# purchase orders sent to the showrooms come out of it.
WAREHOUSE = Showroom('warehouse', 'Admin', 'Warehouse', 'ADM')
WAREHOUSE_ID = WAREHOUSE.id

ADMIN_USERNAME = 'admin'

# how logins are listed: the showrooms in the frontend's order, then the admin
LOGIN_ORDER: tuple[str, ...] = (*SHOWROOM_IDS, ADMIN_USERNAME)
