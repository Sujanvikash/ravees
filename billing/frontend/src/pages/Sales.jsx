import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ReceiptText } from 'lucide-react';
import { LocationPicker, PeriodTabs, SearchBox } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatTile from '../components/StatTile.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { inr, inrWhole } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';
import { filterSales, saleCost, summarize } from '../lib/reports.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PAGE = 100;

/**
 * Completed bills. A showroom sees only its own; the admin sees every showroom and, on top, the purchase
 * cost and gross profit of each bill.
 */
const Sales = ({ session, onMenu }) => {
  const admin = session.role === 'admin';
  const { sales } = useStore();
  const [period, setPeriod] = useState('30d');
  const [location, setLocation] = useState(admin ? null : session.location);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  const scoped = useMemo(() => filterSales(sales, { location, period }), [sales, location, period]);
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      [...scoped]
        .filter((s) => !q || `${s.billNo} ${s.customer} ${s.phone}`.toLowerCase().includes(q))
        .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [scoped, q],
  );
  const sum = summarize(scoped);
  const shop = locationById(session.location);
  const cols = admin ? 10 : 8;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[shop ? `${shop.city} · ${shop.area}` : 'All showrooms', 'Sales']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs value={period} onChange={setPeriod} />
            {admin && <LocationPicker value={location} onChange={setLocation} />}
            <SearchBox value={query} onChange={setQuery} placeholder="Bill number, customer or mobile" />
          </div>

          <div className={`grid grid-cols-2 gap-3 ${admin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
            <StatTile label="Sales" value={inrWhole(sum.total)} note="incl. GST" />
            <StatTile label="Bills" value={sum.bills.toLocaleString('en-IN')} note={`${sum.units.toLocaleString('en-IN')} units sold`} />
            <StatTile label="Average bill" value={inrWhole(sum.average)} />
            <StatTile label="GST collected" value={inrWhole(sum.tax)} />
            {admin && <StatTile label="Purchase cost" value={inrWhole(sum.cost)} note="at cost price" />}
            {admin && (
              <StatTile
                label="Gross profit"
                value={inrWhole(sum.profit)}
                note={`${(sum.margin * 100).toFixed(1)}% margin on sales excl. GST`}
                tone={sum.profit >= 0 ? 'good' : 'bad'}
              />
            )}
          </div>

          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <ReceiptText size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">No bills {q ? 'match that search' : 'in this period'}</div>
                <div className="text-[13px] text-ink-3">Completed sales from the billing counter show up here.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] text-[13px]">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="w-8 py-2.5 pl-4" />
                      <th scope="col" className="py-2.5 pr-3 font-medium">Bill</th>
                      <th scope="col" className="py-2.5 pr-3 font-medium">Date</th>
                      {admin && <th scope="col" className="py-2.5 pr-3 font-medium">Showroom</th>}
                      <th scope="col" className="py-2.5 pr-3 font-medium">Customer</th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">Items</th>
                      <th scope="col" className="py-2.5 pr-3 font-medium">Payment</th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">Amount</th>
                      {admin && <th scope="col" className="py-2.5 pr-3 text-right font-medium">Cost</th>}
                      {admin && <th scope="col" className="py-2.5 pr-4 text-right font-medium">Profit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, limit).map((s) => {
                      const id = `${s.location}-${s.billNo}`;
                      const isOpen = open === id;
                      const cost = saleCost(s);
                      return (
                        <Fragment key={id}>
                          <tr className={`border-b border-line-soft tabular-nums ${isOpen ? 'bg-mist-2' : 'hover:bg-mist-2'}`}>
                            <td className="py-2.5 pl-4">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : id)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} items on ${s.billNo}`}
                                className="inline-flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-mist hover:text-ink"
                              >
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-xs">
                              {s.billNo}
                              {s.demo && <span className="ml-2 rounded bg-warn-50 px-1 font-sans text-[10px] font-medium text-warn-ink">DEMO</span>}
                            </td>
                            <td className="py-2.5 pr-3 whitespace-nowrap text-ink-2">{when.format(new Date(s.at))}</td>
                            {admin && <td className="py-2.5 pr-3 text-ink-2">{locationById(s.location)?.city ?? '—'}</td>}
                            <td className="py-2.5 pr-3">
                              <div className="font-medium">{s.name || 'Walk-in'}</div>
                              {s.phone && <div className="text-xs text-ink-3">{formatMobile(s.phone)}</div>}
                            </td>
                            <td className="py-2.5 pr-3 text-right">{s.totals.qty}</td>
                            <td className="py-2.5 pr-3 text-ink-2">{methodLabel(s.payment.method)}</td>
                            <td className="py-2.5 pr-3 text-right font-semibold">{inr(s.totals.payable)}</td>
                            {admin && <td className="py-2.5 pr-3 text-right text-ink-2">{inr(cost)}</td>}
                            {admin && (
                              <td className={`py-2.5 pr-4 text-right font-medium ${s.totals.taxable - cost >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>
                                {inr(s.totals.taxable - cost)}
                              </td>
                            )}
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line-soft bg-mist-2">
                              <td colSpan={cols} className="px-4 pt-1 pb-3">
                                <ul className="ml-8 flex animate-pop flex-col rounded-xl border border-line-soft bg-surface p-2">
                                  {s.lines.map((l) => (
                                    <li key={l.code} className="flex items-center gap-3 px-2 py-1.5 tabular-nums">
                                      <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                                      <span className="text-xs text-ink-3">
                                        {l.qty} × {inr(l.price)}
                                      </span>
                                      {admin && <span className="w-36 text-right text-xs text-ink-3">cost {inr(l.cost ?? 0)} each</span>}
                                      <span className="w-24 text-right font-medium">{inr(l.price * l.qty)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > limit && (
                  <div className="border-t border-line-soft p-3 text-center">
                    <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="h-8 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-mist">
                      Show more ({rows.length - limit} left)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Sales;
