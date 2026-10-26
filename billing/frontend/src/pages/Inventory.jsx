import { useMemo, useState } from 'react';
import { Boxes, CircleCheck, FileSpreadsheet, PackagePlus, Tag } from 'lucide-react';
import { LocationPicker, SearchBox, Segmented } from '../components/Filters.jsx';
import ImportStockDialog from '../components/ImportStockDialog.jsx';
import NewProductDialog from '../components/NewProductDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StockSummary from '../components/StockSummary.jsx';
import StockHistory from '../components/StockHistory.jsx';
import { LOCATIONS, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useCatalogue } from '../hooks/useCatalogue.js';
import { priceOf } from '../lib/bill.js';
import { SEASON, setInSeason } from '../lib/catalogue.js';
import { inr } from '../lib/money.js';
import { orderQty, pendingByProduct, receivedByProduct } from '../lib/orders.js';
import { stockLog } from '../lib/stockLog.js';
import { importedByProduct } from '../lib/stockImports.js';

const LOW = 5; // at or below this many units counts as low stock

const TABS = [
  { id: 'stock', label: 'Stock' },
  { id: 'history', label: 'History' },
];

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
const Inventory = ({ session, intent, onMenu, onNavigate }) => {
  const admin = session.role === 'admin';
  const { stock, sales, orders, imports } = useStore();
  const [location, setLocation] = useState(admin ? null : session.location);
  const [tab, setTab] = useState(intent?.tab ?? 'stock');
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState(null); // { text, history }
  const products = useCatalogue();
  const [view, setView] = useState('all');
  const [scope, setScope] = useState('tracked');
  const [query, setQuery] = useState('');
  const shops = useMemo(() => (location ? [locationById(location)] : LOCATIONS), [location]);

  // Per showroom and product: units received (counted in from orders, or imported from Excel), sold, on order
  // (sent, not counted yet) and requested.
  const moved = useMemo(() => {
    const sold = {};
    for (const s of sales) if (!s.demo) for (const l of s.lines) (sold[s.location] ??= {})[l.code] = (sold[s.location]?.[l.code] ?? 0) + l.qty;
    const per = (fn) => Object.fromEntries(LOCATIONS.map((l) => [l.id, fn(l.id)]));
    return {
      sold,
      received: per((id) => {
        const got = { ...receivedByProduct(orders, id) };
        for (const [code, qty] of Object.entries(importedByProduct(imports, id))) got[code] = (got[code] ?? 0) + qty;
        return got;
      }),
      onOrder: per((id) => pendingByProduct(orders, id, 'sent')),
      requested: per((id) => pendingByProduct(orders, id, 'requested')),
    };
  }, [orders, sales, imports]);

  const log = useMemo(() => stockLog(orders, imports, location), [orders, imports, location]);

  const imported = (record) => {
    setImporting(false);
    setFlash({ text: `${orderQty(record.lines).toLocaleString('en-IN')} units from ${record.file} added to ${locationById(record.location).city} stock.`, history: true });
  };

  const added = (product, qty) => {
    setAdding(false);
    setFlash({ text: `${product.code} · ${product.name} added${qty ? ` with ${qty} in stock` : ''}. Bill it by typing ${product.code} at the counter.`, history: qty > 0 });
    setScope('shop');
    setQuery('');
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qtyIn = (shopId, code) => stock[shopId]?.[code] ?? 0;
    return products.map((p) => {
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
      if (scope === 'shop' && !p.shop) return false;
      if (q && !`${p.code} ${p.name}`.toLowerCase().includes(q)) return false;
      if (view === 'low') return qty > 0 && qty <= LOW;
      if (view === 'out') return qty <= 0 && tracked;
      return true;
    });
  }, [products, shops, stock, moved, query, scope, view]);

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
      {/* The page scrolls as one: filters and tiles go first, then the rows run under the table's sticky column
          headings. The panel reaches at least the bottom of the window. Below xl the table scrolls in its own box. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 p-3 lg:flex-1 lg:px-5 lg:py-4">
          {/* what you are looking at (and for the admin, which showroom), and what you can do; the table's own
              filters sit on top of the table */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Segmented label="View" options={TABS} value={tab} onChange={setTab} />
                {admin && <LocationPicker value={location} onChange={setLocation} />}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(true);
                    setFlash(null);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-evergreen-800/25 bg-white px-3.5 text-[13px] font-semibold text-evergreen-900 shadow-[0_1px_2px_rgba(9,9,11,0.06)] hover:border-evergreen-800/50 hover:bg-evergreen-50"
                >
                  <Tag size={15} aria-hidden="true" /> New product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImporting(true);
                    setFlash(null);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-evergreen-800/25 bg-white px-3.5 text-[13px] font-semibold text-evergreen-900 shadow-[0_1px_2px_rgba(9,9,11,0.06)] hover:border-evergreen-800/50 hover:bg-evergreen-50"
                >
                  <FileSpreadsheet size={15} aria-hidden="true" /> Import stock
                </button>
                {!admin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('orders')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-evergreen-800 px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
                  >
                    <PackagePlus size={15} aria-hidden="true" /> Request stock
                  </button>
                )}
              </div>
            </div>
          </div>

          {flash && (
            <p role="status" className="flex animate-pop items-center gap-2 rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok-ink">
              <CircleCheck size={15} className="shrink-0" aria-hidden="true" /> {flash.text}
              {flash.history && (
                <button type="button" onClick={() => setTab('history')} className="ml-auto underline underline-offset-2 hover:no-underline">
                  See history
                </button>
              )}
            </p>
          )}

          {tab === 'stock' && (
            <StockSummary totals={totals} where={location ? locationById(location).city : 'All showrooms'} atCost={admin} low={LOW} />
          )}

          <section className="overflow-clip rounded-2xl border glass lg:flex lg:flex-1 lg:flex-col">
            {tab === 'stock' && (
              <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3">
                <Segmented label="Stock level" options={VIEWS} value={view} onChange={setView} />
                <Segmented
                  label="Products"
                  options={[
                    { id: 'tracked', label: `Season ${SEASON} & stocked` },
                    { id: 'everything', label: 'All products' },
                    { id: 'shop', label: 'Shop-added' },
                  ]}
                  value={scope}
                  onChange={setScope}
                />
                <div className="flex flex-1 justify-end">
                  <SearchBox value={query} onChange={setQuery} placeholder="Code or product name" />
                </div>
              </div>
            )}
            {tab === 'history' ? (
              <StockHistory entries={log} showShop={!location} />
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:flex-1">
                <Boxes size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">Nothing to show</div>
                <div className="text-[13px] text-ink-3">Add a purchase to put stock in, or change the filters.</div>
              </div>
            ) : (
              <div className="max-h-[70dvh] overflow-auto xl:max-h-none xl:overflow-visible">
                <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
                  <thead className="sticky top-0 z-1 bg-white/95 shadow-[0_1px_0_var(--color-line-soft)] backdrop-blur">
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      {admin && (
                        <th scope="col" className="w-0 py-1.5 pl-4 font-medium whitespace-nowrap" title={`Tick to sell in Season ${SEASON}`}>
                          In season
                        </th>
                      )}
                      <th scope="col" className={`py-1.5 pr-3 font-medium ${admin ? 'pl-3' : 'pl-4'}`}>Code</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Product</th>
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">{admin ? 'Cost' : 'Price'}</th>
                      {matrix ? (
                        LOCATIONS.map((l) => (
                          <th key={l.id} scope="col" className="py-1.5 pr-3 text-right font-medium">
                            {l.city}
                          </th>
                        ))
                      ) : (
                        <>
                          <th scope="col" className="py-1.5 pr-3 text-right font-medium">Received</th>
                          <th scope="col" className="py-1.5 pr-3 text-right font-medium">Sold</th>
                          <th scope="col" className="py-1.5 pr-3 text-right font-medium">Requested</th>
                          <th scope="col" className="py-1.5 pr-3 text-right font-medium">On order</th>
                        </>
                      )}
                      {matrix && <th scope="col" className="py-1.5 pr-3 text-right font-medium">On order</th>}
                      <th scope="col" className="py-1.5 pr-3 text-right font-medium">{matrix ? 'Total' : 'In stock'}</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-1.5 pr-4 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ p, perShop, qty, received, sold, onOrder, requested }) => (
                      <tr key={p.code} className="row-hover border-b border-line-soft">
                        {admin && (
                          <td className="py-1.5 pl-4 text-center">
                            <input
                              type="checkbox"
                              checked={p.inSeason}
                              onChange={(e) => setInSeason(p.code, e.target.checked).catch((err) => setFlash({ text: err.message, history: false }))}
                              aria-label={`${p.name} in Season ${SEASON}`}
                              className="size-4 cursor-pointer accent-evergreen-800"
                            />
                          </td>
                        )}
                        <td className={`py-1.5 pr-3 font-mono text-xs ${admin ? 'pl-3' : 'pl-4'}`}>{p.code}</td>
                        <td className="py-1.5 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-ink-3">
                            {p.dept}
                            {p.shop ? (
                              <span className="ml-1.5 text-warn-ink">· Added by {p.shop.by}</span>
                            ) : (
                              p.inSeason && <span className="ml-1.5 text-evergreen-800">· Season {SEASON}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-ink-2">{inr(unitValue(p))}</td>
                        {matrix ? (
                          perShop.map((n, i) => (
                            <td key={LOCATIONS[i].id} className={`py-1.5 pr-3 text-right ${n <= 0 ? 'text-ink-3' : ''}`}>
                              {n}
                            </td>
                          ))
                        ) : (
                          <>
                            <td className="py-1.5 pr-3 text-right text-ink-2">{received}</td>
                            <td className="py-1.5 pr-3 text-right text-ink-2">{sold}</td>
                            <td className={`py-1.5 pr-3 text-right ${requested ? 'text-warn-ink' : 'text-ink-3'}`}>{requested || '—'}</td>
                            <td className={`py-1.5 pr-3 text-right ${onOrder ? 'font-medium text-evergreen-800' : 'text-ink-3'}`}>{onOrder || '—'}</td>
                          </>
                        )}
                        {matrix && <td className={`py-1.5 pr-3 text-right ${onOrder ? 'font-medium text-evergreen-800' : 'text-ink-3'}`}>{onOrder || '—'}</td>}
                        <td className="py-1.5 pr-3 text-right font-semibold">{qty}</td>
                        <td className="py-1.5 pr-3">
                          <Status qty={qty} />
                        </td>
                        <td className="py-1.5 pr-4 text-right">{inr(Math.max(qty, 0) * unitValue(p))}</td>
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

      {adding && <NewProductDialog session={session} defaultLocation={location} onClose={() => setAdding(false)} onDone={added} />}
      {importing && <ImportStockDialog session={session} defaultLocation={location} onClose={() => setImporting(false)} onDone={imported} />}
    </div>
  );
};

export default Inventory;
