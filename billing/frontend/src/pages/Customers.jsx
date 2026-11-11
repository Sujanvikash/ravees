import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { customersFrom } from '../lib/customers.js';
import { inr, inrWhole } from '../lib/money.js';
import Pager from '../components/Pager.jsx';
import { usePages } from '../hooks/usePages.js';
import { rowClick } from '../lib/rowClick.js';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PAGE = 100;

const SORTS = [
  { id: 'net', label: 'Top spenders' },
  { id: 'last', label: 'Most recent' },
  { id: 'bills', label: 'Most visits' },
];
const ORDER = {
  net: (a, b) => b.net - a.net,
  last: (a, b) => (a.last < b.last ? 1 : -1),
  bills: (a, b) => b.bills - a.bills || b.net - a.net,
};

/** One customer opened: every bill with its items, and anything brought back. */
const History = ({ customer, showShop, onOpenBill }) => (
  <div className="ml-8 grid animate-pop gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
    <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line-soft bg-surface">
      {[...customer.sales]
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onOpenBill(s)}
              title="Open this bill in Sales"
              className="w-full px-3 py-2 text-left hover:bg-mist"
            >
            <div className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
              <span className="font-mono text-xs text-ink-2">{s.billNo}</span>
              <span className="text-ink-3">{when.format(new Date(s.at))}</span>
              {showShop && <span className="text-ink-3">{locationById(s.location)?.label}</span>}
              <span className="ml-auto font-semibold tabular-nums">{inr(s.totals.payable)}</span>
            </div>
            <div className="mt-0.5 text-xs text-ink-3">{s.lines.map((l) => `${l.name} × ${l.qty}`).join(' · ')}</div>
            </button>
          </li>
        ))}
    </ul>
    <div className="flex flex-col gap-2 text-xs">
      <div className="font-semibold text-ink-2">Returns</div>
      {customer.returns.length === 0 ? (
        <p className="text-ink-3">Nothing brought back.</p>
      ) : (
        customer.returns.map((r) => (
          <div key={r.id} className="rounded-lg bg-mist px-2.5 py-1.5">
            <div className="flex justify-between gap-2">
              <span className="font-mono">{r.returnNo}</span>
              <span className="font-semibold tabular-nums">{inr(r.amount)}</span>
            </div>
            <div className="text-ink-3">
              {r.kind === 'exchange' ? `Exchange, new bill ${r.exchangeBillNo}` : 'Refunded in cash'} · against {r.billNo}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

/**
 * Customers, from the bills: one per mobile number, with how many bills, what they spent (less returns), their
 * average bill, first and last visit, and the showrooms they bought at. Open one to see every bill and return.
 * A showroom sees its own customers; the admin sees everyone, or one showroom's.
 */
const Customers = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { sales, returns } = useStore();
  const [location, setLocation] = useState(admin ? null : session.location);
  const [sort, setSort] = useState('net');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [monthAgo] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString()); // fixed while the page is open

  const all = useMemo(
    () =>
      customersFrom(
        sales.filter((s) => !location || s.location === location),
        returns.filter((r) => !location || r.location === location),
      ),
    [sales, returns, location],
  );
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const rows = all.filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits))).sort(ORDER[sort]);
  const paged = usePages(rows, PAGE, `${q}|${sort}|${location}`);

  const repeat = all.filter((c) => c.bills > 1).length;
  const net = all.reduce((t, c) => t + c.net, 0);
  const shop = locationById(session.location);
  const crumb = admin ? (location ? locationById(location).label : 'All showrooms') : `${shop.city} · ${shop.area}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[crumb, 'Customers']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          {admin && (
            <div className="flex flex-wrap items-center gap-2">
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          )}

          <SummaryStrip
            figures={[
              { label: 'Customers', value: all.length.toLocaleString('en-IN'), note: 'one per mobile number' },
              { label: 'Came back', value: repeat.toLocaleString('en-IN'), note: `${all.length ? Math.round((repeat / all.length) * 100) : 0}% bought more than once` },
              { label: 'New in the last 30 days', value: all.filter((c) => c.first >= monthAgo).length.toLocaleString('en-IN') },
              { label: 'Average per customer', value: inrWhole(all.length ? net / all.length : 0), note: 'spent, less returns' },
            ]}
          />

          <section className="overflow-clip rounded-2xl border glass">
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
              <span className="text-[13px] text-ink-3">
                {rows.length.toLocaleString('en-IN')} {rows.length === 1 ? 'customer' : 'customers'}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Segmented label="Sort customers" options={SORTS} value={sort} onChange={setSort} />
                <SearchBox value={query} onChange={setQuery} placeholder="Name or mobile" />
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Users size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">{q ? 'No customer matches that search' : 'No customers yet'}</div>
                <div className="text-[13px] text-ink-3">Every bill’s customer shows up here, with what they bought.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th className="w-8 py-2 pl-4" />
                      <th className="py-2 pr-3 font-medium">Customer</th>
                      <th className="py-2 pr-3 font-medium">Mobile</th>
                      <th className="py-2 pr-3 text-right font-medium">Bills</th>
                      <th className="py-2 pr-3 text-right font-medium">Spent</th>
                      <th className="py-2 pr-3 text-right font-medium">Returns</th>
                      <th className="py-2 pr-3 text-right font-medium">Net</th>
                      <th className="py-2 pr-3 text-right font-medium">Average bill</th>
                      <th className="py-2 pr-3 font-medium">First visit</th>
                      <th className="py-2 pr-3 font-medium">Last visit</th>
                      {admin && !location && <th className="py-2 pr-4 font-medium">Showrooms</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((c) => {
                      const isOpen = open === c.phone;
                      return (
                        <Fragment key={c.phone}>
                          <tr onClick={rowClick(() => setOpen(isOpen ? null : c.phone))} className={`cursor-pointer border-b border-line-soft ${isOpen ? 'bg-mist-2' : 'row-hover'}`}>
                            <td className="py-2 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : c.phone)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} ${c.name}’s bills`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-2 pr-3 font-medium">
                              {c.name || '—'}
                              {c.bills > 1 && <span className="ml-2 rounded-full bg-ok-50 px-2 py-0.5 text-[11px] font-medium text-ok-ink">Repeat</span>}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{formatMobile(c.phone)}</td>
                            <td className="py-2 pr-3 text-right">{c.bills}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{inrWhole(c.spent)}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{c.returned ? inrWhole(c.returned) : '—'}</td>
                            <td className="py-2 pr-3 text-right font-semibold">{inrWhole(c.net)}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{inrWhole(c.spent / c.bills)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{day.format(new Date(c.first))}</td>
                            <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{day.format(new Date(c.last))}</td>
                            {admin && !location && (
                              <td className="py-2 pr-4 text-ink-2">{c.showrooms.map((id) => locationById(id)?.label).join(', ')}</td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={admin && !location ? 11 : 10} className="px-4 pt-1 pb-4">
                                <History customer={c} showShop={admin && !location} onOpenBill={(bill) => onNavigate('sales', { bill: { billNo: bill.billNo, location: bill.location } })} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <Pager {...paged.pager} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Customers;
