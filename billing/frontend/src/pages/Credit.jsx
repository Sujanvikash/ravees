import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, HandCoins, Printer } from 'lucide-react';
import CollectBalance from '../components/CollectBalance.jsx';
import { LocationPicker, PeriodTabs, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { activeLocations, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { usePages } from '../hooks/usePages.js';
import { formatMobile, phoneDigits } from '../lib/customer.js';
import { inr, inrWhole } from '../lib/money.js';
import { AGE_BANDS, ageBand, daysSince, isCreditBill, methodLabel, paidSoFar } from '../lib/payment.js';
import { periodStart } from '../lib/reports.js';
import { printAlone } from '../lib/print.js';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PAGE = 100;

const VIEWS = [
  { id: 'bills', label: 'Bills owing' },
  { id: 'customers', label: 'By customer' },
  { id: 'payments', label: 'Payments received' },
];
const SORTS = [
  { id: 'oldest', label: 'Oldest first' },
  { id: 'largest', label: 'Largest first' },
];

// How the age of what's owed reads: fine in the first week, then warmer the longer it waits.
const AGE_TONE = { week: 'text-ink-2', month: 'text-warn-ink', two: 'text-ruby-ink', old: 'font-semibold text-ruby-ink' };
const AGE_BAR = { week: 'bg-evergreen-700', month: 'bg-amber-400', two: 'bg-ruby/70', old: 'bg-ruby' };

const th = 'py-1.5 pr-3 font-medium';
const actionButton =
  'inline-flex h-7 items-center gap-1 rounded-lg border border-evergreen-800/25 bg-white px-2.5 text-xs font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50';

/** How much is owed in each age band, as one bar and a legend. */
const Ageing = ({ open }) => {
  const total = open.reduce((t, s) => t + s.balance, 0);
  const bands = AGE_BANDS.map((b) => {
    const bills = open.filter((s) => ageBand(daysSince(s.at)).id === b.id);
    return { ...b, bills: bills.length, amount: bills.reduce((t, s) => t + s.balance, 0) };
  });
  return (
    <section className="rounded-2xl border glass p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold">How long it has been owed</h2>
        <span className="text-xs text-ink-3">from the bill date</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
        {bands.map((b) => total > 0 && b.amount > 0 && <span key={b.id} className={AGE_BAR[b.id]} style={{ width: `${(b.amount / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {bands.map((b) => (
          <li key={b.id} className="text-[13px]">
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className={`size-2 rounded-full ${AGE_BAR[b.id]}`} aria-hidden="true" />
              {b.label}
            </div>
            <div className={`font-semibold tabular-nums ${b.amount > 0 ? AGE_TONE[b.id] : 'text-ink-3'}`}>{inr(b.amount)}</div>
            <div className="text-xs text-ink-3">
              {b.bills} {b.bills === 1 ? 'bill' : 'bills'}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

/**
 * Credit bills: what customers still owe on bills they didn't pay in full, and the payments taken since. A store
 * sees its own and collects from here (or from Sales); the admin sees every store, store by store, and only
 * views. Everything is worked out from the bills already loaded, so it is always in step with Sales.
 */
const Credit = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { sales } = useStore();
  const [location, setLocation] = useState(admin ? null : session.location);
  const [view, setView] = useState('bills');
  const [sort, setSort] = useState('oldest');
  const [period, setPeriod] = useState('30d'); // for payments received
  const [query, setQuery] = useState('');
  const [collecting, setCollecting] = useState(null); // the id of the bill being collected on
  const [reprint, setReprint] = useState(null); // { sale, collection } to print again

  useEffect(() => {
    if (reprint) printAlone();
  }, [reprint]);

  const now = new Date();
  const mine = useMemo(() => sales.filter((s) => (!location || s.location === location) && isCreditBill(s)), [sales, location]);
  const open = useMemo(() => mine.filter((s) => s.balance > 0), [mine]);
  const from = periodStart(period, now);
  const payments = mine
    .flatMap((s) => (s.collections ?? []).map((c) => ({ ...c, sale: s })))
    .filter((c) => !from || new Date(c.at) >= from)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const q = query.trim().toLowerCase();
  const matches = (s) => !q || `${s.billNo} ${s.name} ${s.phone}`.toLowerCase().includes(q);
  const bills = open.filter(matches).sort(sort === 'largest' ? (a, b) => b.balance - a.balance : (a, b) => new Date(a.at) - new Date(b.at));
  // customers who owe, by mobile number: what they owe across their bills, and since when
  const customers = useMemo(() => {
    const by = new Map();
    for (const s of open) {
      const key = phoneDigits(s.phone) || s.id;
      const c = by.get(key) ?? { key, phone: s.phone, name: s.name, bills: [], balance: 0, oldest: s.at };
      c.bills.push(s);
      c.balance += s.balance;
      if (new Date(s.at) < new Date(c.oldest)) c.oldest = s.at;
      if (s.name) c.name = s.name;
      by.set(key, c);
    }
    return [...by.values()]
      .filter((c) => !q || `${c.name} ${c.phone} ${c.bills.map((b) => b.billNo).join(' ')}`.toLowerCase().includes(q))
      .sort(sort === 'largest' ? (a, b) => b.balance - a.balance : (a, b) => new Date(a.oldest) - new Date(b.oldest));
  }, [open, q, sort]);
  const shownPayments = payments.filter((c) => !q || `${c.receiptNo} ${c.sale.billNo} ${c.sale.name} ${c.sale.phone}`.toLowerCase().includes(q));

  const outstanding = open.reduce((t, s) => t + s.balance, 0);
  const overdue = open.filter((s) => daysSince(s.at, now) > 30);
  const month = periodStart('30d', now);
  const givenLately = mine.filter((s) => new Date(s.at) >= month).reduce((t, s) => t + s.payment.later, 0);
  const collectedLately = mine
    .flatMap((s) => s.collections ?? [])
    .filter((c) => new Date(c.at) >= month)
    .reduce((t, c) => t + c.amount, 0);
  const owingCustomers = new Set(open.map((s) => phoneDigits(s.phone) || s.id)).size;

  const byStore = admin
    ? activeLocations().map((l) => {
        const here = sales.filter((s) => s.location === l.id && isCreditBill(s));
        const owing = here.filter((s) => s.balance > 0);
        return {
          location: l,
          bills: owing.length,
          outstanding: owing.reduce((t, s) => t + s.balance, 0),
          overdue: owing.filter((s) => daysSince(s.at, now) > 30).reduce((t, s) => t + s.balance, 0),
          collected: here
            .flatMap((s) => s.collections ?? [])
            .filter((c) => new Date(c.at) >= month)
            .reduce((t, c) => t + c.amount, 0),
        };
      })
    : [];

  const rows = view === 'bills' ? bills : view === 'customers' ? customers : shownPayments;
  const paged = usePages(rows, PAGE, `${view}|${location}|${q}|${sort}|${period}`);
  const openInSales = (s) => onNavigate('sales', { bill: { location: s.location, billNo: s.billNo } });
  const collectingSale = collecting ? sales.find((s) => s.id === collecting) : null;
  const shop = locationById(session.location);

  const billButtons = (s) => (
    <span className="flex justify-end gap-1.5">
      {!admin && s.balance > 0 && (
        <button type="button" onClick={() => setCollecting(s.id)} className={actionButton}>
          <HandCoins size={13} aria-hidden="true" /> Collect
        </button>
      )}
      <button type="button" onClick={() => openInSales(s)} title="Open this bill in Sales" className="inline-flex size-7 items-center justify-center rounded-lg text-ink-3 hover:bg-mist hover:text-ink">
        <ArrowUpRight size={14} />
        <span className="sr-only">Open {s.billNo} in Sales</span>
      </button>
    </span>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[shop ? `${shop.city} · ${shop.area}` : 'All showrooms', 'Credit bills']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          {admin && (
            <div className="flex flex-wrap items-center gap-2">
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          )}

          <SummaryStrip
            figures={[
              {
                label: `Owed to ${location ? locationById(location)?.city : 'all showrooms'}`,
                value: inrWhole(outstanding),
                note: `${open.length} ${open.length === 1 ? 'bill' : 'bills'} · ${owingCustomers} ${owingCustomers === 1 ? 'customer' : 'customers'}`,
              },
              {
                label: 'Owed over 30 days',
                value: inrWhole(overdue.reduce((t, s) => t + s.balance, 0)),
                note: `${overdue.length} ${overdue.length === 1 ? 'bill' : 'bills'}`,
                tone: overdue.length ? 'warn' : undefined,
              },
              { label: 'Given on credit', value: inrWhole(givenLately), note: 'last 30 days' },
              { label: 'Collected', value: inrWhole(collectedLately), note: 'last 30 days' },
            ]}
          />

          {admin && !location && (
            <section className="overflow-clip rounded-2xl border glass">
              <div className="border-b border-line-soft px-4 py-2.5 text-[13px] font-semibold">
                By showroom <span className="font-normal text-ink-3">· open one to see its bills</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className={`${th} pl-4`}>Showroom</th>
                      <th scope="col" className={`${th} text-right`}>Bills owing</th>
                      <th scope="col" className={`${th} text-right`}>Owed</th>
                      <th scope="col" className={`${th} text-right`}>Over 30 days</th>
                      <th scope="col" className={`${th} pr-4 text-right`}>Collected · 30 days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStore.map((r) => (
                      <tr key={r.location.id} onClick={() => setLocation(r.location.id)} className="cursor-pointer border-b border-line-soft row-hover">
                        <td className="py-2 pr-3 pl-4 font-medium">
                          {r.location.city} <span className="font-normal text-ink-3">· {r.location.area}</span>
                        </td>
                        <td className="py-2 pr-3 text-right text-ink-2">{r.bills}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{inr(r.outstanding)}</td>
                        <td className={`py-2 pr-3 text-right ${r.overdue > 0 ? 'text-ruby-ink' : 'text-ink-3'}`}>{inr(r.overdue)}</td>
                        <td className="py-2 pr-4 text-right text-ink-2">{inr(r.collected)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2 pr-3 pl-4">All showrooms</td>
                      <td className="py-2 pr-3 text-right">{byStore.reduce((t, r) => t + r.bills, 0)}</td>
                      <td className="py-2 pr-3 text-right">{inr(byStore.reduce((t, r) => t + r.outstanding, 0))}</td>
                      <td className="py-2 pr-3 text-right">{inr(byStore.reduce((t, r) => t + r.overdue, 0))}</td>
                      <td className="py-2 pr-4 text-right">{inr(byStore.reduce((t, r) => t + r.collected, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {open.length > 0 && <Ageing open={open} />}

          <section className="overflow-clip rounded-2xl border glass">
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
              <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
              {view === 'payments' ? (
                <PeriodTabs value={period} onChange={setPeriod} />
              ) : (
                <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} />
              )}
              <div className="flex flex-1 justify-end">
                <SearchBox value={query} onChange={setQuery} placeholder="Bill, receipt, customer or mobile" />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <HandCoins size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">
                  {q ? 'Nothing matches that search' : view === 'payments' ? 'No payments received in this period' : 'Nobody owes anything'}
                </div>
                <div className="text-[13px] text-ink-3">
                  {view === 'payments'
                    ? 'Payments taken towards credit bills show up here, with their receipt numbers.'
                    : 'A bill becomes a credit bill when “Credit bill” is turned on while collecting payment at the counter.'}
                </div>
              </div>
            ) : (
              <div className="max-h-[70dvh] overflow-auto xl:max-h-none xl:overflow-visible">
                {view === 'bills' && (
                  <table className="w-full min-w-[60rem] text-[13px] tabular-nums">
                    <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
                      <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                        <th scope="col" className={`${th} pl-4`}>Bill</th>
                        <th scope="col" className={th}>Date</th>
                        <th scope="col" className={`${th} text-right`}>Age</th>
                        {admin && <th scope="col" className={th}>Showroom</th>}
                        <th scope="col" className={th}>Customer</th>
                        <th scope="col" className={`${th} text-right`}>Bill amount</th>
                        <th scope="col" className={`${th} text-right`}>Paid</th>
                        <th scope="col" className={`${th} text-right`}>Owed</th>
                        <th scope="col" className={`${th} pr-4`} />
                      </tr>
                    </thead>
                    <tbody>
                      {paged.rows.map((s) => {
                        const age = daysSince(s.at, now);
                        return (
                          <tr key={s.id} className="border-b border-line-soft row-hover">
                            <td className="py-2 pr-3 pl-4 font-mono text-xs">{s.billNo}</td>
                            <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{day.format(new Date(s.at))}</td>
                            <td className={`py-2 pr-3 text-right whitespace-nowrap ${AGE_TONE[ageBand(age).id]}`}>{age === 0 ? 'today' : `${age} d`}</td>
                            {admin && <td className="py-2 pr-3 text-ink-2">{locationById(s.location)?.city ?? '—'}</td>}
                            <td className="py-2 pr-3">
                              <div className="font-medium">{s.name || 'Walk-in'}</div>
                              {s.phone && <div className="text-xs text-ink-3">{formatMobile(s.phone)}</div>}
                            </td>
                            <td className="py-2 pr-3 text-right text-ink-2">{inr(s.totals.payable)}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{inr(paidSoFar(s))}</td>
                            <td className="py-2 pr-3 text-right font-semibold text-warn-ink">{inr(s.balance)}</td>
                            <td className="py-2 pr-4">
                              {billButtons(s)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {view === 'customers' && (
                  <table className="w-full min-w-[48rem] text-[13px] tabular-nums">
                    <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
                      <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                        <th scope="col" className={`${th} pl-4`}>Customer</th>
                        <th scope="col" className={th}>Bills owing</th>
                        <th scope="col" className={`${th} text-right`}>Owing since</th>
                        <th scope="col" className={`${th} pr-4 text-right`}>Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.rows.map((c) => (
                        <tr key={c.key} className="border-b border-line-soft align-top row-hover">
                          <td className="py-2 pr-3 pl-4">
                            <div className="font-medium">{c.name || 'Walk-in'}</div>
                            {c.phone && <div className="text-xs text-ink-3">{formatMobile(c.phone)}</div>}
                          </td>
                          <td className="py-2 pr-3">
                            <ul className="flex flex-col gap-1">
                              {c.bills.map((s) => (
                                <li key={s.id} className="flex items-center gap-2">
                                  <span className="font-mono text-xs">{s.billNo}</span>
                                  <span className="text-xs text-ink-3">{inr(s.balance)}</span>
                                  {billButtons(s)}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className={`py-2 pr-3 text-right whitespace-nowrap ${AGE_TONE[ageBand(daysSince(c.oldest, now)).id]}`}>
                            {day.format(new Date(c.oldest))}
                            <div className="text-xs">{daysSince(c.oldest, now)} days</div>
                          </td>
                          <td className="py-2 pr-4 text-right font-semibold text-warn-ink">{inr(c.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {view === 'payments' && (
                  <table className="w-full min-w-[56rem] text-[13px] tabular-nums">
                    <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
                      <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                        <th scope="col" className={`${th} pl-4`}>Receipt</th>
                        <th scope="col" className={th}>Received</th>
                        {admin && <th scope="col" className={th}>Showroom</th>}
                        <th scope="col" className={th}>Against bill</th>
                        <th scope="col" className={th}>Customer</th>
                        <th scope="col" className={th}>Paid by</th>
                        <th scope="col" className={`${th} text-right`}>Amount</th>
                        <th scope="col" className={`${th} text-right`}>Owed after</th>
                        <th scope="col" className={`${th} pr-4`} />
                      </tr>
                    </thead>
                    <tbody>
                      {paged.rows.map((c) => (
                        <tr key={c.id} className="border-b border-line-soft row-hover">
                          <td className="py-2 pr-3 pl-4 font-mono text-xs">{c.receiptNo}</td>
                          <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(c.at))}</td>
                          {admin && <td className="py-2 pr-3 text-ink-2">{locationById(c.sale.location)?.city ?? '—'}</td>}
                          <td className="py-2 pr-3 font-mono text-xs">{c.sale.billNo}</td>
                          <td className="py-2 pr-3">{c.sale.name || (c.sale.phone ? formatMobile(c.sale.phone) : 'Walk-in')}</td>
                          <td className="py-2 pr-3 text-ink-2">{methodLabel(c.payment.method)}</td>
                          <td className="py-2 pr-3 text-right font-semibold">{inr(c.amount)}</td>
                          <td className="py-2 pr-3 text-right text-ink-2">{c.payment.after > 0 ? inr(c.payment.after) : 'Paid in full'}</td>
                          <td className="py-2 pr-4">
                            <span className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReprint({ sale: c.sale, collection: c })}
                                title="Print this receipt again"
                                className="inline-flex size-7 items-center justify-center rounded-lg text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <Printer size={14} />
                                <span className="sr-only">Print {c.receiptNo} again</span>
                              </button>
                              <button type="button" onClick={() => openInSales(c.sale)} title="Open the bill in Sales" className="inline-flex size-7 items-center justify-center rounded-lg text-ink-3 hover:bg-mist hover:text-ink">
                                <ArrowUpRight size={14} />
                                <span className="sr-only">Open {c.sale.billNo} in Sales</span>
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <Pager {...paged.pager} />
              </div>
            )}
          </section>
        </div>
      </div>

      {collectingSale && <CollectBalance sale={collectingSale} onClose={() => setCollecting(null)} />}
      {reprint && createPortal(<PaymentReceiptPrint sale={reprint.sale} collection={reprint.collection} />, document.body)}
    </div>
  );
};

export default Credit;
