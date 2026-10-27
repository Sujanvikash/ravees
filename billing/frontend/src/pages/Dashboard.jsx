import { useMemo, useState } from 'react';
import { ClipboardList, LayoutDashboard } from 'lucide-react';
import CashDifferences from '../components/CashDifferences.jsx';
import DayChart from '../components/DayChart.jsx';
import { LocationPicker, PeriodTabs } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { inr, inrWhole } from '../lib/money.js';
import { orderQty } from '../lib/orders.js';
import { METHODS } from '../lib/payment.js';
import { byLocation, byMethod, filterSales, periodStart, salesByDay, summarize, topProducts } from '../lib/reports.js';

const CHART_DAYS = { today: 7, '7d': 7, '30d': 30, all: 30 };

const Card = ({ title, note, children, className = '' }) => (
  <section className={`rounded-2xl border glass p-4 ${className}`}>
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {note && <span className="text-xs text-ink-3">{note}</span>}
    </div>
    {children}
  </section>
);

/** A single-hue bar inside a table cell, so rows compare at a glance; the number beside it is the value. */
const Bar = ({ value, max }) => (
  <span className="block h-2 w-full rounded-full bg-mist" aria-hidden="true">
    <span className="block h-2 rounded-full bg-evergreen-800" style={{ width: `${max ? Math.max((value / max) * 100, value ? 2 : 0) : 0}%` }} />
  </span>
);

const pct = (n) => `${(n * 100).toFixed(1)}%`;

/**
 * The admin's view of all five showrooms: sales, purchase cost, gross profit and margin, GST, stock
 * counted in, sales by day, by showroom, top products and payment methods, for a period and showroom.
 */
const Dashboard = ({ onMenu, onNavigate }) => {
  const { sales, orders, returns, closes } = useStore();
  const [period, setPeriod] = useState('30d');
  const [location, setLocation] = useState(null);
  const now = useMemo(() => new Date(), []);

  const scoped = useMemo(() => filterSales(sales, { location, period, now }), [sales, location, period, now]);
  const sum = summarize(scoped);
  const days = salesByDay(scoped, CHART_DAYS[period], now);
  const shops = byLocation(filterSales(sales, { period, now }));
  const products = topProducts(scoped);
  const methods = byMethod(scoped);
  const toReview = orders.filter((o) => o.status === 'requested').length;
  const returnsTotal = filterSales(returns, { location, period, now }).reduce((t, r) => t + r.amount, 0);

  const from = periodStart(period, now);
  const received = orders.filter(
    (o) => o.status === 'received' && (!location || o.location === location) && (!from || new Date(o.updatedAt) >= from),
  );
  const receivedValue = received.reduce(
    (s, o) => s + (o.counted ?? []).reduce((t, c) => t + c.qty * (o.lines.find((l) => l.code === c.code)?.rate ?? 0), 0),
    0,
  );
  const receivedUnits = received.reduce((s, o) => s + orderQty(o.counted ?? []), 0);

  const maxShop = Math.max(...shops.map((s) => s.total));
  const maxProduct = Math.max(0, ...products.map((p) => p.total));
  const methodTotal = Object.values(methods).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[location ? locationById(location).city : 'All showrooms', 'Dashboard']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs value={period} onChange={setPeriod} />
            <LocationPicker value={location} onChange={setLocation} />
            {returnsTotal > 0 && (
              <span className="ml-auto text-xs text-ink-3">
                Returns this period: <span className="font-semibold text-ink-2 tabular-nums">{inrWhole(returnsTotal)}</span> · net sales{' '}
                <span className="font-semibold text-ink-2 tabular-nums">{inrWhole(sum.total - returnsTotal)}</span>
              </span>
            )}
          </div>

          <CashDifferences closes={closes} location={location} onOpen={() => onNavigate('cash')} />

          {toReview > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="flex items-center gap-3 rounded-2xl border border-warn-ink/20 bg-warn-50 px-4 py-3 text-left text-[13px] text-warn-ink hover:border-warn-ink/40"
            >
              <ClipboardList size={17} aria-hidden="true" />
              <span>
                <span className="font-semibold">
                  {toReview} purchase {toReview === 1 ? 'request' : 'requests'} to review
                </span>{' '}
                from the showrooms
              </span>
              <span className="ml-auto font-semibold">Review →</span>
            </button>
          )}

          {sales.length === 0 ? (
            <section className="flex flex-col items-center gap-3 rounded-2xl border glass px-6 py-16 text-center">
              <LayoutDashboard size={22} className="text-ink-3" aria-hidden="true" />
              <div className="text-[15px] font-semibold">No sales yet</div>
              <p className="max-w-md text-[13px] text-ink-3">
                Bills from the five showroom counters show up here as they are made. To see the dashboard with a month of
                sample sales, sign out and turn on Demo on the sign-in screen.
              </p>
            </section>
          ) : (
            <>
              <SummaryStrip
                figures={[
                  { label: `Sales · ${location ? locationById(location).city : 'All showrooms'}`, value: inrWhole(sum.total), note: `${sum.bills.toLocaleString('en-IN')} bills · incl. GST` },
                  { label: 'Gross profit', value: inrWhole(sum.profit), note: `${pct(sum.margin)} margin`, tone: sum.profit < 0 ? 'bad' : undefined },
                  { label: 'Purchase cost', value: inrWhole(sum.cost), note: 'of the goods sold' },
                  { label: 'GST collected', value: inrWhole(sum.tax) },
                  { label: 'Stock received', value: inrWhole(receivedValue), note: `${receivedUnits.toLocaleString('en-IN')} units counted in` },
                ]}
              />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <Card title="Sales by day" note={`last ${CHART_DAYS[period]} days · incl. GST`}>
                  <DayChart data={days} />
                </Card>
                <Card title="Payment methods">
                  <ul className="flex flex-col gap-3.5">
                    {METHODS.map(({ id, label, Icon }) => (
                      <li key={id} className="text-[13px]">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-ink-2">
                            <Icon size={14} aria-hidden="true" /> {id === 'split' ? 'UPI / card part of split' : label}
                          </span>
                          <span className="tabular-nums">
                            <span className="font-medium">{inrWhole(methods[id])}</span>
                            <span className="ml-2 text-xs text-ink-3">{methodTotal ? pct(methods[id] / methodTotal) : '0%'}</span>
                          </span>
                        </div>
                        <Bar value={methods[id]} max={methodTotal} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-ink-3">Average bill {inr(sum.average)}</p>
                </Card>
              </div>

              <Card title="By showroom" note="for the period, every showroom">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-[13px] tabular-nums">
                    <thead>
                      <tr className="text-left text-xs text-ink-3">
                        <th scope="col" className="pb-2 font-medium">Showroom</th>
                        <th scope="col" className="w-1/4 pb-2 font-medium">Sales</th>
                        <th scope="col" className="pb-2 text-right font-medium">Bills</th>
                        <th scope="col" className="pb-2 text-right font-medium">Average bill</th>
                        <th scope="col" className="pb-2 text-right font-medium">Purchase cost</th>
                        <th scope="col" className="pb-2 text-right font-medium">Gross profit</th>
                        <th scope="col" className="pb-2 text-right font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map((s) => (
                        <tr
                          key={s.location.id}
                          className={`border-t border-line-soft ${location === s.location.id ? 'bg-evergreen-50' : ''}`}
                        >
                          <td className="py-1.5 pr-3">
                            <button type="button" onClick={() => setLocation(location === s.location.id ? null : s.location.id)} className="font-medium hover:underline">
                              {s.location.city}
                            </button>
                          </td>
                          <td className="py-1.5 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="w-24 shrink-0 font-medium">{inrWhole(s.total)}</span>
                              <Bar value={s.total} max={maxShop} />
                            </div>
                          </td>
                          <td className="py-2.5 text-right">{s.bills}</td>
                          <td className="py-2.5 text-right">{inrWhole(s.average)}</td>
                          <td className="py-2.5 text-right text-ink-2">{inrWhole(s.cost)}</td>
                          <td className={`py-2.5 text-right font-medium ${s.profit >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>{inrWhole(s.profit)}</td>
                          <td className="py-2.5 text-right text-ink-2">{pct(s.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Top products" note="by sales value">
                {products.length === 0 ? (
                  <p className="text-[13px] text-ink-3">No sales in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[48rem] text-[13px] tabular-nums">
                      <thead>
                        <tr className="text-left text-xs text-ink-3">
                          <th scope="col" className="pb-2 font-medium">Product</th>
                          <th scope="col" className="w-1/4 pb-2 font-medium">Sales</th>
                          <th scope="col" className="pb-2 text-right font-medium">Units</th>
                          <th scope="col" className="pb-2 text-right font-medium">Purchase cost</th>
                          <th scope="col" className="pb-2 text-right font-medium">Gross profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.code} className="border-t border-line-soft">
                            <td className="py-1.5 pr-3">
                              <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                              {p.name}
                            </td>
                            <td className="py-1.5 pr-4">
                              <div className="flex items-center gap-3">
                                <span className="w-24 shrink-0 font-medium">{inrWhole(p.total)}</span>
                                <Bar value={p.total} max={maxProduct} />
                              </div>
                            </td>
                            <td className="py-2.5 text-right">{p.units}</td>
                            <td className="py-2.5 text-right text-ink-2">{inrWhole(p.cost)}</td>
                            <td className={`py-2.5 text-right font-medium ${p.profit >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>{inrWhole(p.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <p className="text-xs text-ink-3">
                Purchase cost is each product's cost price at the time it was sold. Gross profit = sales without GST − purchase cost,
                assuming cost prices are also without GST.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
