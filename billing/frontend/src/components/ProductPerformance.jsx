import { useMemo, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { productSellThrough } from '../lib/reports.js';
import { SearchBox, Segmented } from './Filters.jsx';
import Pager from '../components/Pager.jsx';
import { usePages } from '../hooks/usePages.js';

const SORTS = [
  { id: 'sold', label: 'Most sold' },
  { id: 'slow', label: 'Slowest' },
  { id: 'left', label: 'Most left' },
];
const ORDER = {
  sold: (a, b) => b.sold - a.sold || b.share - a.share,
  slow: (a, b) => a.share - b.share || b.left - a.left,
  left: (a, b) => b.left - a.left,
};
const PAGE = 15;
const GRID = 'grid grid-cols-[minmax(0,16rem)_1fr_3.5rem_3.5rem_3.5rem_3.5rem] items-center gap-x-4';
const n = (v) => v.toLocaleString('en-IN');

/**
 * How each product is selling, season to date: one bar per product, the green part is units sold and the grey
 * part units still in stock, so fast and slow sellers stand out. For one showroom or all (location null).
 * Sorted by most sold, slowest (lowest share sold) or most left, with a search.
 */
const ProductPerformance = ({ location = null }) => {
  const { sales, returns, stock } = useStore();
  const [sort, setSort] = useState('sold');
  const [query, setQuery] = useState('');
  const all = useMemo(() => productSellThrough(sales, returns, stock, location), [sales, returns, stock, location]);
  const q = query.trim().toLowerCase();
  const rows = all.filter((r) => !q || `${r.code} ${r.name}`.toLowerCase().includes(q)).sort(ORDER[sort]);
  const paged = usePages(rows, PAGE, `${q}|${sort}|${location}`);
  const sold = all.reduce((t, r) => t + r.sold, 0);
  const left = all.reduce((t, r) => t + r.left, 0);

  return (
    <section className="rounded-2xl border glass p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">Product performance</h2>
          <p className="text-xs text-ink-3">
            Season to date · {n(sold)} of {n(sold + left)} units sold, {n(left)} still in stock
            {sold + left > 0 && ` (${Math.round((sold / (sold + left)) * 100)}% sold)`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-2" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-ok" /> Sold
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-line-strong" /> In stock
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented label="Sort products" options={SORTS} value={sort} onChange={setSort} />
          <SearchBox value={query} onChange={setQuery} placeholder="Code or product" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <PackageSearch size={22} className="text-ink-3" aria-hidden="true" />
          <p className="text-[13px] text-ink-3">{q ? 'No product matches that search.' : 'No stock or sales yet.'}</p>
        </div>
      ) : (
        <>
          {/* product · bar · total, sold, left and share sold in their own columns, so nothing has to be added up */}
          <div className={`${GRID} border-b border-line-soft pb-1.5 text-xs text-ink-3`} aria-hidden="true">
            <span>Product</span>
            <span />
            <span className="text-right">Total</span>
            <span className="text-right">Sold</span>
            <span className="text-right">Left</span>
            <span className="text-right">Sold %</span>
          </div>
          <ul className="flex flex-col">
            {paged.rows.map((r) => {
              const pct = Math.round(r.share * 100);
              return (
                <li key={r.code} className={`${GRID} border-t border-line-soft py-2 text-[13px] first:border-t-0`}>
                  <span className="min-w-0 truncate" title={r.name}>
                    <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{r.code}</span>
                    {r.name}
                  </span>
                  <span
                    className="flex h-3 w-full overflow-hidden rounded-full bg-line-strong"
                    role="img"
                    aria-label={`${r.name}: ${r.sold} of ${r.sold + r.left} sold, ${r.left} in stock`}
                  >
                    <span className="h-full bg-ok" style={{ width: `${r.share * 100}%` }} />
                  </span>
                  <span className="text-right text-ink-2 tabular-nums">{n(r.sold + r.left)}</span>
                  <span className="text-right font-semibold text-ok-ink tabular-nums">{n(r.sold)}</span>
                  <span className="text-right text-ink-2 tabular-nums">{n(r.left)}</span>
                  <span className="text-right font-semibold tabular-nums">{pct}%</span>
                </li>
              );
            })}
          </ul>
          <Pager {...paged.pager} className="mt-2 border-t border-line-soft pt-2" />
        </>
      )}
    </section>
  );
};

export default ProductPerformance;
