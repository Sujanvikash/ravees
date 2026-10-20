import { useMemo, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { SEASON, SEASON_COUNT, PRODUCTS, findProduct, searchProducts } from '../lib/catalogue.js';
import { priceOf } from '../lib/bill.js';
import { inr } from '../lib/money.js';

const NOTICE_TONE = {
  ok: 'bg-ok-50 text-ok-ink',
  warn: 'bg-warn-50 text-warn-ink',
  error: 'bg-ruby-50 text-ruby-ink',
};

/**
 * The scan box. A barcode scanner types the code and presses Enter, which adds the product. Typing a
 * name instead lists matches: arrow keys move, Enter or a click adds.
 */
const ScanBar = ({ inputRef, seasonOnly, onSeasonOnly, onAdd, notice, onNotice }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = useMemo(() => searchProducts(query, { seasonOnly }), [query, seasonOnly]);

  const add = (product) => {
    onAdd(product);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const typed = query.trim();
      if (!typed) return;
      const exact = findProduct(typed);
      if (exact) add(exact);
      else if (matches.length) add(matches[Math.min(active, matches.length - 1)]);
      else {
        onNotice({ tone: 'error', text: `No product with code “${typed}”` });
        setQuery('');
      }
    }
  };

  const scopes = [
    { on: seasonOnly, label: `Season ${SEASON}`, pick: () => onSeasonOnly(true), disabled: SEASON_COUNT === 0 },
    { on: !seasonOnly, label: 'All products', pick: () => onSeasonOnly(false) },
  ];

  return (
    <section className="relative rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <label
          htmlFor="scan"
          className="flex h-12 min-w-0 flex-[1_1_360px] cursor-text items-center gap-3 rounded-lg border-2 border-line-strong px-3.5 focus-within:border-evergreen-800 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.16)]"
        >
          <ScanBarcode size={24} strokeWidth={1.8} className="text-evergreen-800" aria-hidden="true" />
          <span className="sr-only">Scan barcode or search product</span>
          <input
            id="scan"
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoFocus
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls="scan-matches"
            aria-activedescendant={matches.length ? `match-${active}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              onNotice(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Scan barcode, or type a product code or name…"
            className="min-w-0 flex-1 bg-transparent text-lg font-medium placeholder:text-ink-3"
          />
          <span className="rounded-md bg-mist px-2 py-1 font-mono text-[11px] whitespace-nowrap text-ink-2">Enter ↵</span>
        </label>

        <div role="group" aria-label="Product range" className="inline-flex gap-1 rounded-lg bg-mist p-1">
          {scopes.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={s.on}
              onClick={s.pick}
              disabled={s.disabled}
              title={s.disabled ? `No products are marked “In Season ${SEASON}” yet` : undefined}
              className={`h-9 rounded-md px-3 text-[13px] font-semibold disabled:opacity-50 ${
                s.on ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(10,33,23,0.16)]' : 'text-ink-2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span>
          {seasonOnly
            ? `Searching ${SEASON_COUNT.toLocaleString('en-IN')} Season ${SEASON} products`
            : `Searching all ${PRODUCTS.length.toLocaleString('en-IN')} products`}
        </span>
        {notice && (
          <span role="status" className={`rounded-full px-2 py-px font-semibold ${NOTICE_TONE[notice.tone]}`}>
            {notice.text}
          </span>
        )}
      </div>

      {matches.length > 0 && (
        <div className="absolute inset-x-3 top-16 z-10 overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_40px_rgba(10,33,23,0.14)]">
          <div className="border-b border-line-soft px-3.5 py-2 text-xs text-ink-3">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} · ↑ ↓ to choose, Enter to add
          </div>
          <ul id="scan-matches" role="listbox" aria-label="Matching products">
            {matches.map((p, i) => (
              <li
                key={p.code}
                id={`match-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p)}
                onMouseEnter={() => setActive(i)}
                className={`grid cursor-pointer grid-cols-[88px_minmax(0,1fr)_130px_100px] items-center gap-3 border-b border-mist px-3.5 py-2 ${
                  i === active ? 'bg-evergreen-50' : ''
                }`}
              >
                <span className="font-mono text-[13px] font-semibold text-evergreen-800">{p.code}</span>
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span className="text-xs text-ink-3">{p.dept}</span>
                <span className="text-right font-mono text-sm">{inr(priceOf(p))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ScanBar;
