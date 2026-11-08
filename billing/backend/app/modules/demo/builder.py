"""
Builds the demo schema from nothing: the tables, the showrooms and logins, the catalogue from the product Excel,
and a month of sample activity made through the same services the app uses, so every figure adds up:

  opening stock   each showroom's sheet in seed/opening-stock-2026, imported 5 weeks ago
  admin stock     a supplier delivery into the admin's own stock (the season's products and the showrooms' lines)
  a delivery      the season's products added to each showroom's stock by the admin
  sales           about 30 days of bills, busier towards Christmas, only for what is in stock
  returns         a few returns and one exchange
  cash closes     every past day closed, a few with a small difference
  orders          one of each state: to review (two), fulfilled by an invoice, rejected, cancelled
  boxes           supplier boxes in the admin warehouse and transfer invoices: raised, paid, added to stock
  quotations      a couple per showroom, one of them expired
  purchase returns   one on its way to the admin, one counted in

It is made the same way every time (a seeded random generator), relative to now.
"""

import math
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import db_models  # noqa: F401  (registers every table)
from app.core import clock
from app.core.config import BACKEND_DIR
from app.core.database import DEMO_SCHEMA, Base, get_demo_engine, get_engine, get_session_factory
from app.modules.boxes import service as boxes
from app.modules.boxes.schemas import BoxesIn, BoxIn
from app.modules.cash import service as cash
from app.modules.cash.schemas import CloseIn
from app.modules.invoices import service as invoices
from app.modules.invoices.schemas import DocumentsIn, InvoiceIn, PayIn
from app.modules.locations import repository as locations
from app.modules.locations.constants import ADMIN_USERNAME, SHOWROOMS, WAREHOUSE_ID
from app.modules.orders import service as orders
from app.modules.orders.schemas import CountedLineIn, OrderIn, OrderLineIn
from app.modules.products import repository as products
from app.modules.products import service as products_service
from app.modules.products.importer import DEFAULT_EXCEL, read_catalogue
from app.modules.quotes import service as quotes
from app.modules.quotes.schemas import QuoteIn
from app.modules.returns import service as returns
from app.modules.returns.schemas import ExchangeIn, ReturnIn
from app.modules.sales import bill
from app.modules.sales import service as sales
from app.modules.sales.schemas import LineIn, PaymentIn, SaleIn, SplitIn
from app.modules.stock import repository as stock
from app.modules.stock import service as stock_service
from app.modules.stock.schemas import ImportLineIn, StockImportIn
from app.modules.transfers import service as transfers
from app.modules.transfers.schemas import StockReturnIn, StockReturnReceiveIn
from app.modules.users import repository as users
from app.modules.users import service as users_service

OPENING_DIR = BACKEND_DIR / 'seed' / 'opening-stock-2026'
DAYS = 30
FLOAT = 2000  # cash kept in each drawer overnight
SMALL_RETURN = 1500  # the most a sample return refunds
WEIGHT = {'chennai': 1.4, 'bengaluru': 1.1, 'mumbai': 1.2, 'pune': 0.8, 'goa': 0.6}
METHODS = ['cash', 'cash', 'upi', 'upi', 'upi', 'card', 'split']
NAMES = [
    'Priya Raman',
    'Arjun Mehta',
    'Kavya Iyer',
    'Rohan Desai',
    'Ananya Rao',
    'Vikram Nair',
    'Sneha Kulkarni',
    'Aditya Shetty',
    'Meera Pillai',
    'Karthik Subramanian',
    'Divya Menon',
    'Rahul Joshi',
    'Lakshmi Narayan',
    'Siddharth Fernandes',
    'Pooja Gupta',
    'Nikhil Patil',
    'Shreya Das',
    'Joseph DSouza',
    'Anjali Krishnan',
    'Farhan Sheikh',
    'Neha Bhat',
    'Varun Reddy',
    'Maria Pereira',
    'Ishaan Kapoor',
    'Ritika Sharma',
]


@dataclass(frozen=True, slots=True)
class DemoReport:
    sales: int
    returns: int
    orders: int
    quotes: int

    def __str__(self) -> str:
        return (
            f'Demo ready: 5 showrooms and the admin, {self.sales} sales, {self.returns} returns, '
            f'{self.orders} purchase orders and {self.quotes} quotations.'
        )


def demo_exists() -> bool:
    with get_engine().connect() as conn:
        return bool(
            conn.scalar(
                text("select 1 from information_schema.tables where table_schema = :s and table_name = 'users'"),
                {'s': DEMO_SCHEMA},
            )
        )


def _recreate_schema() -> None:
    with get_engine().begin() as conn:
        conn.execute(text(f'DROP SCHEMA IF EXISTS {DEMO_SCHEMA} CASCADE'))
        conn.execute(text(f'CREATE SCHEMA {DEMO_SCHEMA}'))
    with get_demo_engine().begin() as conn:
        Base.metadata.create_all(conn)


def _opening(path: Path) -> list[tuple[str, int, float]]:
    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        rows = list(wb.active.iter_rows(values_only=True))
    finally:
        wb.close()
    header = [str(h or '').strip().lower() for h in rows[0]]
    code, qty, rate = header.index('code'), header.index('qty'), header.index('purchase rate')
    return [(str(r[code]).strip().upper(), int(r[qty]), float(r[rate] or 0)) for r in rows[1:] if r[code] and r[qty]]


def _at(day: date, rand: random.Random, start: int = 10, end: int = 20) -> datetime:
    return datetime.combine(day, time(rand.randint(start, end - 1), rand.randint(0, 59)), clock.IST)


def _mobile(rand: random.Random) -> str:
    return f'{rand.choice("6789")}{rand.randint(0, 999_999_999):09d}'


class _Builder:
    def __init__(self, session: Session, now: datetime) -> None:
        self.s = session
        self.now = now
        self.today = now.astimezone(clock.IST).date()
        self.rand = random.Random(2026)
        self.admin = users.get(session, ADMIN_USERNAME)
        self.shops = {sh.id: users.get(session, sh.id) for sh in SHOWROOMS}
        self.chennai_order = None  # the request an invoice answers, made by open_orders
        self.counts = {'sales': 0, 'returns': 0, 'orders': 0, 'quotes': 0}
        self.bills: dict[str, list] = {sh.id: [] for sh in SHOWROOMS}
        # each showroom's customers: a pool of 60, the first ones regulars who come back often, so the Customers
        # page has repeat buyers; a few shop at two showrooms
        firsts = [n.split()[0] for n in NAMES]
        lasts = [n.split()[-1] for n in NAMES]
        people = [(f'{f} {la}', _mobile(self.rand)) for f in firsts for la in lasts]
        self.rand.shuffle(people)
        self.customers = {sh.id: people[i * 50 : i * 50 + 60] for i, sh in enumerate(SHOWROOMS)}

    def day(self, ago: int) -> date:
        return self.today - timedelta(days=ago)

    def have(self, location: str) -> dict[str, int]:
        return {lv.code: lv.qty for lv in stock.levels(self.s, location) if lv.qty > 0}

    def opening_stock(self) -> None:
        for sh in SHOWROOMS:
            path = OPENING_DIR / f'opening-stock-{sh.id}.xlsx'
            rows = _opening(path) if path.exists() else []
            known = products.by_codes(self.s, (c for c, _, _ in rows))
            lines = [ImportLineIn(code=c, qty=q, rate=r) for c, q, r in rows if c in known]
            if lines:
                stock_service.import_stock(
                    self.s,
                    self.admin,
                    StockImportIn(id=uuid.uuid4(), location=sh.id, file=path.name, lines=lines),
                    at=_at(self.day(DAYS + 5), self.rand),
                )

    def stock_admin(self) -> None:
        """The admin's own stock: plenty of the season's products, and some of everything the showrooms carry, so
        the purchase orders below can be sent out of it."""
        codes = {p.code: 250 for p in products.list_all(self.s) if p.in_season}
        for sh in SHOWROOMS:
            for code in stock.levels(self.s, sh.id):
                codes.setdefault(code.code, 60)
        stock_service.import_stock(
            self.s,
            self.admin,
            StockImportIn(
                id=uuid.uuid4(),
                location=WAREHOUSE_ID,
                file='supplier-delivery-2026.xlsx',
                lines=[ImportLineIn(code=c, qty=q) for c, q in codes.items()],
            ),
            at=_at(self.day(DAYS + 2), self.rand),
        )

    def season_delivery(self) -> None:
        season = [p for p in products.list_all(self.s) if p.in_season]
        for sh in SHOWROOMS:
            lines = [ImportLineIn(code=p.code, qty=self.rand.randint(12, 30)) for p in season]
            stock_service.import_stock(
                self.s,
                self.admin,
                StockImportIn(id=uuid.uuid4(), location=sh.id, file='season-delivery-2026.xlsx', lines=lines),
                at=_at(self.day(DAYS), self.rand),
            )

    def payment(self, payable: float) -> PaymentIn:
        method = self.rand.choice(METHODS)
        if method == 'cash':
            step = 500 if payable > 2000 else 100
            return PaymentIn(method='cash', received=math.ceil(payable / step) * step)
        if method == 'split':
            part = max(100, math.floor(payable * self.rand.uniform(0.2, 0.6) / 100) * 100)
            if part >= payable:
                return PaymentIn(method='upi')
            if self.rand.random() < 0.5:
                return PaymentIn(method='split', split=SplitIn(cash=part, upi=payable - part))
            return PaymentIn(method='split', split=SplitIn(cash=part, card=payable - part))
        if method == 'card':
            return PaymentIn(method='card', approval=f'{self.rand.randint(100000, 999999)}')
        return PaymentIn(method='upi')

    def sell(self) -> None:
        for ago in range(DAYS - 1, -1, -1):
            rush = 1 + (DAYS - ago) / DAYS
            day = self.day(ago)
            for sh in SHOWROOMS:
                have = self.have(sh.id)
                count = round((2 + self.rand.random() * 4) * WEIGHT[sh.id] * rush)
                # through the day in order, so the bill numbers run with the time
                for at in sorted(_at(day, self.rand) for _ in range(count)):
                    if at > self.now or not have:
                        continue
                    items: dict[str, int] = {}
                    for _ in range(self.rand.randint(1, 4)):
                        code = self.rand.choice(sorted(have))
                        if have[code] - items.get(code, 0) > 0:
                            items[code] = items.get(code, 0) + 1
                    if not items:
                        continue
                    for code, q in items.items():
                        have[code] -= q
                        if have[code] <= 0:
                            del have[code]
                    catalogue = products.by_codes(self.s, items)
                    payable = bill.totals(bill.bill_lines(items.items(), catalogue))['payable']
                    sale = sales.create_sale(
                        self.s,
                        self.shops[sh.id],
                        SaleIn(
                            id=uuid.uuid4(),
                            lines=[LineIn(code=c, qty=q) for c, q in items.items()],
                            phone=(who := self.customer(sh.id))[1],
                            name=who[0],
                            payment=self.payment(payable),
                        ),
                        at=at,
                    )
                    self.bills[sh.id].append(sale)
                    self.counts['sales'] += 1

    def customer(self, location: str) -> tuple[str, str]:
        """A customer of this showroom, regulars more often: the n-th in its pool is picked about 1/(n+3) as often."""
        pool = self.customers[location]
        return self.rand.choices(pool, weights=[1 / (i + 3) for i in range(len(pool))])[0]

    def take_returns(self) -> None:
        for i, sh in enumerate(SHOWROOMS):
            # a small item off a recent bill: a cash refund must fit in what the drawer holds that day
            recent = [
                b
                for b in self.bills[sh.id]
                if (self.now - b.at).days <= 8 and min(ln.price for ln in b.lines) <= SMALL_RETURN
            ]
            if not recent:
                continue
            sale = recent[len(recent) // 2]
            line = min(sale.lines, key=lambda ln: ln.price)
            at = min(sale.at + timedelta(days=1, hours=2), self.now - timedelta(minutes=30))
            exchange = None
            if i == 0:  # Chennai: one exchange, for another product in stock
                have = self.have(sh.id)
                other = next((c for c in sorted(have) if c != line.code), None)
                if other:
                    exchange = ExchangeIn(
                        id=uuid.uuid4(), lines=[LineIn(code=other, qty=1)], payment=PaymentIn(method='upi')
                    )
            returns.create_return(
                self.s,
                self.shops[sh.id],
                ReturnIn(
                    id=uuid.uuid4(),
                    sale_id=sale.id,
                    lines=[LineIn(code=line.code, qty=1)],
                    reason='Wanted a different size' if exchange else 'Gift not needed',
                    exchange=exchange,
                ),
                at=at,
            )
            self.counts['returns'] += 1

    def close_days(self) -> None:
        for sh in SHOWROOMS:
            opening = Decimal(FLOAT)
            for ago in range(DAYS - 1, 0, -1):
                day = self.day(ago)
                f = cash.get_day(self.s, self.shops[sh.id], None, day)
                expected = Decimal(str(opening)) + Decimal(str(f.cash_sales)) - Decimal(str(f.cash_refunds))
                off = self.rand.choice([0] * 8 + [-200, -50, 100])
                counted = max(expected + off, Decimal(0))
                cash.close_day(
                    self.s,
                    self.shops[sh.id],
                    CloseIn(
                        day=day,
                        opening=float(opening),
                        counted=float(counted),
                        float_next=float(min(FLOAT, counted)),
                        note='' if not off else ('Short: checking with the counter staff' if off < 0 else 'Over'),
                    ),
                    at=datetime.combine(day, time(21, 15), clock.IST),
                )
                opening = min(Decimal(FLOAT), counted)

    def open_orders(self) -> None:
        def lines(location: str, n: int) -> list[OrderLineIn]:
            low = sorted(self.have(location).items(), key=lambda kv: kv[1])[:n]
            return [OrderLineIn(code=c, qty=self.rand.randint(6, 15)) for c, _ in low] or [
                OrderLineIn(code=p.code, qty=10) for p in products.list_all(self.s)[:n]
            ]

        def request(location: str, ago: int, note: str):
            self.counts['orders'] += 1
            return orders.create_order(
                self.s,
                self.shops[location],
                OrderIn(lines=lines(location, 4), note=note),
                at=_at(self.day(ago), self.rand),
            )

        self.chennai_order = request('chennai', 3, 'Running low before the weekend')
        request('bengaluru', 1, 'Trees are selling fast')
        request('mumbai', 0, '')
        o = request('goa', 4, '')
        orders.reject(self.s, self.admin, o.id, 'Goa has enough of these; ask Mumbai', at=_at(self.day(3), self.rand))
        o = request('pune', 2, '')
        orders.cancel(self.s, self.shops['pune'], o.id, at=_at(self.day(2), self.rand))

    def write_quotes(self) -> None:
        season = [p.code for p in products.list_all(self.s) if p.in_season]
        for sh in SHOWROOMS:
            for ago, days in ((12, 7), (2, 15)):
                codes = self.rand.sample(season, k=min(3, len(season)))
                quotes.create_quote(
                    self.s,
                    self.shops[sh.id],
                    QuoteIn(
                        id=uuid.uuid4(),
                        lines=[LineIn(code=c, qty=self.rand.randint(1, 3)) for c in codes],
                        name=self.rand.choice(NAMES),
                        phone=_mobile(self.rand),
                        valid_days=days,
                        note='Corporate order: delivery before 20 December' if ago == 2 else '',
                    ),
                    at=_at(self.day(ago), self.rand),
                )
                self.counts['quotes'] += 1

    def send_back(self) -> None:
        for location, ago, done in (('goa', 6, True), ('pune', 1, False)):
            have = sorted(self.have(location).items(), key=lambda kv: -kv[1])[:2]
            if not have:
                continue
            r = transfers.send_back(
                self.s,
                self.shops[location],
                StockReturnIn(
                    id=uuid.uuid4(),
                    lines=[LineIn(code=c, qty=min(q, 3)) for c, q in have],
                    reason='another-store' if done else 'end-of-season',
                    note='For Mumbai' if done else '',
                ),
                at=_at(self.day(ago), self.rand),
            )
            if done:
                counted = [CountedLineIn(code=ln['code'], qty=ln['qty']) for ln in r.lines]
                transfers.receive(
                    self.s,
                    self.admin,
                    r.id,
                    StockReturnReceiveIn(counted=counted),
                    at=_at(self.day(ago - 2), self.rand),
                )

    def pack_boxes(self) -> None:
        """A shipment of supplier-packed boxes (the products on a real box label) in the admin warehouse. Three go
        to Chennai on a transfer invoice (answering its purchase order): one paid and added to its stock, one
        only raised. Two more are billed to Mumbai."""
        label = ['BR175', 'TA003', 'TA033', 'TA125', 'TA151', 'TA166', 'TA181', 'TA188', 'TA207', 'TA223', 'TA252']
        codes = sorted(products.by_codes(self.s, label))
        if not codes:
            return
        packed = [
            BoxIn(
                id=uuid.uuid4(),
                box_no=f'{154 + i}.GOA',
                stock_no=f'PUA{445 + i:06d}',
                shipment='GOA-1 VELANKA 2026',
                supplier='ARK Global Traders',
                lines=[
                    LineIn(code=c, qty=self.rand.randint(1, 30)) for c in self.rand.sample(codes, min(6, len(codes)))
                ],
            )
            for i in range(8)
        ]
        boxes.save_boxes(self.s, self.admin, BoxesIn(boxes=packed), at=_at(self.day(4), self.rand))
        first = invoices.raise_invoice(
            self.s,
            self.admin,
            InvoiceIn(
                id=uuid.uuid4(),
                location='chennai',
                box_ids=[packed[0].id, packed[1].id],
                order_id=self.chennai_order.id,
                note='Sent with the Monday van',
            ),
            at=_at(self.day(3), self.rand),
        )
        docs = DocumentsIn(eway_no='271012345678', bill_no=first.number)
        invoices.set_documents(self.s, self.admin, first.id, docs, at=_at(self.day(3), self.rand))
        invoices.pay(self.s, self.admin, first.id, PayIn(ref='NEFT 4821'), at=_at(self.day(2), self.rand))
        invoices.add_to_stock(self.s, self.admin, first.id, at=_at(self.day(1), self.rand))
        invoices.raise_invoice(
            self.s,
            self.admin,
            InvoiceIn(id=uuid.uuid4(), location='mumbai', box_ids=[packed[2].id, packed[3].id]),
            at=_at(self.day(1), self.rand),
        )


def build_demo(excel: Path = DEFAULT_EXCEL, *, now: datetime | None = None) -> DemoReport:
    """Throws away the demo schema, if there is one, and builds it again."""
    catalogue = read_catalogue(excel)
    _recreate_schema()
    with get_session_factory(demo=True)() as session:
        locations.add_missing_showrooms(session)
        users_service.add_missing_logins(session)
        products_service.import_catalogue(session, catalogue, season_from_excel=True)
        session.commit()

        b = _Builder(session, now or clock.now())
        b.opening_stock()
        b.stock_admin()
        b.season_delivery()
        b.sell()
        b.take_returns()
        b.close_days()
        b.open_orders()
        b.write_quotes()
        b.send_back()
        b.pack_boxes()
        return DemoReport(**b.counts)
