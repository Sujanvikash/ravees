import { useMemo, useState } from 'react';
import { Boxes, PackagePlus } from 'lucide-react';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatTile from '../components/StatTile.jsx';
import { LOCATIONS, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { priceOf } from '../lib/bill.js';
import { PRODUCTS, SEASON } from '../lib/catalogue.js';
import { inr, inrWhole } from '../lib/money.js';
import { pendingByProduct, receivedByProduct } from '../lib/orders.js';

const LOW = 5; // at or below this many units counts as low stock

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: `Low (≤ ${LOW})` },
  { id: 'out', label: 'Out of stock' },
];

const Status = ({ qty }) =>
  qty <= 0 ? (
    <span className="rounded-full bg-ruby-50 px-2 py-0.5 text-[11px] font-medium text-ruby-ink">Out</span>
  ) : qty <= LOW ? (
    <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-medium text-warn-ink">Low</span>
  ) : (
    <span className="rounded-full bg-ok-50 px-2 py-0.5 text-[11px] font-medium text-ok-ink">In stock</span>
  );

/**
 * Stock on hand per showroom: what was counted in from purchase orders, what was sold, what is left, and
 * what is still requested or on its way. Lists the season's products plus anything with stock or movement;
 * "All products" searches the whole list. The admin can look at one showroom or all five side by side, and
 * sees stock value at cost.
 */
const Inventory = ({ session, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { stock, sales, orders } = useStore();
  const [location, setLocation] = useState(admin ? null : session.location);
  const [view, setView] = useState('all');
  const [scope, setScope] = useState('tracked');
  const [query, setQuery] = useState('');
  const shops = useMemo(() => (location ? [locationById(location)] : LOCATIONS), [location]);

  // Per showroom and product: units counted in, sold, on order (sent, not counted yet) and requested.
  const moved = useMemo(() => {
    const sold = {};
    for (const s of sales) if (!s.demo) for (const l of s.lines) (sold[s.location] ??= {})[l.code] = (sold[s.location]?.[l.code] ?? 0) + l.qty;
    const per = (fn) => Object.fromEntries(LOCATIONS.map((l) => [l.id, fn(l.id)]));
    return {
      sold,
      received: per((id) => receivedByProduct(orders, id)),
      onOrder: per((id) => pendingByProduct(orders, id, 'sent')),
      requested: per((id) => pendingByProduct(orders, id, 'requested')),
    };
  }, [orders, sales]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qtyIn = (shopId, code) => stock[shopId]?.[code] ?? 0;
    return PRODUCTS.map((p) => {
      const perShop = shops.map((s) => qtyIn(s.id, p.code));
      const qty = perShop.reduce((a, b) => a + b, 0);
      const received = shops.reduce((a, s) => a + (moved.received[s.id]?.[p.code] ?? 0), 0);
      const sold = shops.reduce((a, s) => a + (moved.sold[s.id]?.[p.code] ?? 0), 0);
      const onOrder = shops.reduce((a, s) => a + (moved.onOrder[s.id]?.[p.code] ?? 0), 0);
      const requested = shops.reduce((a, s) => a + (moved.requested[s.id]?.[p.code] ?? 0), 0);
      return { p, perShop, qty, received, sold, onOrder, requested };
    }).filter(({ p, qty, received, sold, onOrder, requested }) => {
      const tracked = p.inSeason || qty !== 0 || received > 0 || sold > 0 || onOrder > 0 || requested > 0;
      if (scope === 'tracked' && !tracked) return false;
      if (q && !`${p.code} ${p.name}`.toLowerCase().includes(q)) return false;
      if (view === 'low') return qty > 0 && qty <= LOW;
      if (view === 'out') return qty <= 0 && tracked;
      return true;
    });
  }, [shops, stock, moved, query, scope, view]);

  const shown = rows.slice(0, 300);
  const unitValue = (p) => (admin ? p.cost ?? 0 : priceOf(p));
  const totals = rows.reduce(
    (t, r) => ({
      products: t.products + (r.qty > 0 ? 1 : 0),
      units: t.units + Math.max(r.qty, 0),
      value: t.value + Math.max(r.qty, 0) * unitValue(r.p),
      low: t.low + (r.qty > 0 && r.qty <= LOW ? 1 : 0),
      out: t.out + (r.qty <= 0 && (r.p.inSeason || r.received > 0 || r.sold > 0) ? 1 : 0),
      onOrder: t.onOrder + r.onOrder,
    }),
    { products: 0, units: 0, value: 0, low: 0, out: 0, onOrder: 0 },
  );
  const matrix = admin && !location;
  const crumb = location ? `${locationById(location).city} · ${locationById(location).area}` : 'All showrooms';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[crumb, 'Inventory']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {admin && <LocationPicker value={location} onChange={setLocation} />}
            <Segmented label="Stock level" options={VIEWS} value={view} onChange={setView} />
            <Segmented
              label="Products"
              options={[
                { id: 'tracked', label: `Season ${SEASON} & stocked` },
                { id: 'everything', label: 'All products' },
              ]}
              value={scope}
              onChange={setScope}
            />
            <SearchBox value={query} onChange={setQuery} placeholder="Code or product name" />
            {!admin && (
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
              >
                <PackagePlus size={15} aria-hidden="true" /> Request stock
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatTile label="Products in stock" value={totals.products.toLocaleString('en-IN')} />
            <StatTile label="Units in stock" value={totals.units.toLocaleString('en-IN')} />
            <StatTile label="Stock value" value={inrWhole(totals.value)} note={admin ? 'at cost price' : 'at selling price'} />
            <StatTile label="Low stock" value={totals.low} note={`${LOW} units or fewer`} tone={totals.low ? 'bad' : undefined} />
            <StatTile label="Out of stock" value={totals.out} note="season or stocked items" tone={totals.out ? 'bad' : undefined} />
            <StatTile label="On order" value={totals.onOrder.toLocaleString('en-IN')} note="units sent, not counted in yet" />
          </div>

          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(9,9,11,0.04)]">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Boxes size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">Nothing to show</div>
                <div className="text-[13px] text-ink-3">Add a purchase to put stock in, or change the filters.</div>
              </div>
            ) : (
              <div className="max-h-[calc(100dvh-20rem)] min-h-64 overflow-auto">
                <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
                  <thead className="sticky top-0 z-1 bg-surface/95 backdrop-blur">
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="py-2.5 pr-3 pl-4 font-medium">Code</th>
                      <th scope="col" className="py-2.5 pr-3 font-medium">Product</th>
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">{admin ? 'Cost' : 'Price'}</th>
                      {matrix ? (
                        LOCATIONS.map((l) => (
                          <th key={l.id} scope="col" className="py-2.5 pr-3 text-right font-medium">
                            {l.city}
                          </th>
                        ))
                      ) : (
                        <>
                          <th scope="col" className="py-2.5 pr-3 text-right font-medium">Received</th>
                          <th scope="col" className="py-2.5 pr-3 text-right font-medium">Sold</th>
                          <th scope="col" className="py-2.5 pr-3 text-right font-medium">Requested</th>
                          <th scope="col" className="py-2.5 pr-3 text-right font-medium">On order</th>
                        </>
                      )}
                      {matrix && <th scope="col" className="py-2.5 pr-3 text-right font-medium">On order</th>}
                      <th scope="col" className="py-2.5 pr-3 text-right font-medium">{matrix ? 'Total' : 'In stock'}</th>
                      <th scope="col" className="py-2.5 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-2.5 pr-4 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ p, perShop, qty, received, sold, onOrder, requested }) => (
                      <tr key={p.code} className="border-b border-line-soft hover:bg-mist-2">
                        <td className="py-2 pr-3 pl-4 font-mono text-xs">{p.code}</td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-ink-3">
                            {p.dept}
                            {p.inSeason && <span className="ml-1.5 text-evergreen-800">· Season {SEASON}</span>}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right text-ink-2">{inr(unitValue(p))}</td>
                        {matrix ? (
                          perShop.map((n, i) => (
                            <td key={LOCATIONS[i].id} className={`py-2 pr-3 text-right ${n <= 0 ? 'text-ink-3' : ''}`}>
                              {n}
                            </td>
                          ))
                        ) : (
                          <>
                            <td className="py-2 pr-3 text-right text-ink-2">{received}</td>
                            <td className="py-2 pr-3 text-right text-ink-2">{sold}</td>
                            <td className={`py-2 pr-3 text-right ${requested ? 'text-warn-ink' : 'text-ink-3'}`}>{requested || '—'}</td>
                            <td className={`py-2 pr-3 text-right ${onOrder ? 'font-medium text-evergreen-800' : 'text-ink-3'}`}>{onOrder || '—'}</td>
                          </>
                        )}
                        {matrix && <td className={`py-2 pr-3 text-right ${onOrder ? 'font-medium text-evergreen-800' : 'text-ink-3'}`}>{onOrder || '—'}</td>}
                        <td className="py-2 pr-3 text-right font-semibold">{qty}</td>
                        <td className="py-2 pr-3">
                          <Status qty={qty} />
                        </td>
                        <td className="py-2 pr-4 text-right">{inr(Math.max(qty, 0) * unitValue(p))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > shown.length && (
                  <p className="border-t border-line-soft p-3 text-center text-xs text-ink-3">
                    Showing the first {shown.length} of {rows.length.toLocaleString('en-IN')}: search to narrow it down.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
