import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, ScanBarcode, TriangleAlert } from 'lucide-react';
import { SEASON, PRODUCTS, findProduct, searchProducts } from '../lib/catalogue.js';
import { priceOf } from '../lib/bill.js';
import { inr } from '../lib/money.js';
import Kbd from './Kbd.jsx';

const NOTICE = {
  ok: { Icon: CircleCheck, className: 'text-ok-ink' },
  warn: { Icon: TriangleAlert, className: 'text-warn-ink' },
  error: { Icon: CircleAlert, className: 'text-ruby-ink' },
};

/**
 * The scan box. A barcode scanner types the code and presses Enter, which adds the product. Typing a
 * name instead lists matches from every product, this season's first: arrow keys move, Enter or a click adds.
 * Clicking the empty box (or ↓) lists this season's products, in-stock first, before anything is typed; it
 * doesn't open on focus alone, because the cursor waits in this box for the scanner all day.
 */
const ScanBar = ({ inputRef, onAdd, notice, onNotice, inStock }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  const typedMatches = useMemo(() => {
    const seen = new Set();
    return [...searchProducts(query, { seasonOnly: true }), ...searchProducts(query)].filter((p) => !seen.has(p.code) && seen.add(p.code)).slice(0, 8);
  }, [query]);
  const browse = browsing && !query.trim()
    ? PRODUCTS.filter((p) => p.inSeason).sort((a, b) => (inStock(b.code) > 0) - (inStock(a.code) > 0) || a.name.localeCompare(b.name))
    : [];
  const matches = query.trim() ? typedMatches : browse;

  const add = (product) => {
    onAdd(product);
    setQuery('');
    setActive(0);
    setBrowsing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && browsing) {
      setBrowsing(false);
    } else if (e.key === 'ArrowDown' && !matches.length && !query.trim()) {
      e.preventDefault();
      setBrowsing(true);
      setActive(0);
    } else if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const typed = query.trim();
      if (!typed) {
        if (browse.length) add(browse[Math.min(active, browse.length - 1)]);
        return;
      }
      const exact = findProduct(typed);
      if (exact) add(exact);
      else if (matches.length) add(matches[Math.min(active, matches.length - 1)]);
      else {
        onNotice({ tone: 'error', text: `No product with code “${typed}”. Items without a barcode can be added in Inventory → New product.` });
        setQuery('');
      }
    }
  };

  const tone = notice && NOTICE[notice.tone];

  return (
    <div className="relative">
      <label
        htmlFor="scan"
        className="flex h-14 cursor-text items-center gap-3 rounded-2xl border glass pr-2 pl-4 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_4px_rgba(23,92,38,0.10)]"
      >
        <ScanBarcode size={20} strokeWidth={1.8} className="shrink-0 text-ink-3" aria-hidden="true" />
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
          onClick={() => {
            if (!query.trim()) {
              setBrowsing(true);
              setActive(0);
            }
          }}
          onBlur={() => setBrowsing(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setBrowsing(false);
            onNotice(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Scan a barcode, or search by code or name"
          className="min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-3"
        />
        <Kbd className="hidden sm:inline-flex">F2</Kbd>
      </label>

      <div className="mt-2 flex h-5 items-center gap-3 px-1 text-xs text-ink-3">
        {tone ? (
          <span role="status" key={notice.text} className={`inline-flex animate-pop items-center gap-1.5 font-medium ${tone.className}`}>
            <tone.Icon size={14} aria-hidden="true" />
            {notice.text}
          </span>
        ) : (
          <span>
            {PRODUCTS.length.toLocaleString('en-IN')} products, Season {SEASON} first · ↑ ↓ to choose a match, Enter to add
          </span>
        )}
      </div>

      {matches.length > 0 && (
        <div className="absolute inset-x-0 top-15 z-10 max-h-96 animate-pop overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_-8px_rgba(9,9,11,0.18)]">
          {!query.trim() && (
            <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Season {SEASON} products · in stock first
            </div>
          )}
          <ul id="scan-matches" role="listbox" aria-label={query.trim() ? 'Matching products' : `Season ${SEASON} products`}>
            {matches.map((p, i) => (
              <li
                key={p.code}
                id={`match-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p)}
                onMouseEnter={() => setActive(i)}
                className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-3 py-2 ${
                  i === active ? 'bg-mist' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="hidden truncate text-xs text-ink-3 sm:inline">{p.dept}</span>
                </span>
                <span className="flex items-baseline gap-3">
                  <span className={`text-xs tabular-nums ${inStock(p.code) > 0 ? 'text-ink-3' : 'text-ruby-ink'}`}>
                    {inStock(p.code) > 0 ? `${inStock(p.code)} in stock` : 'Out of stock'}
                  </span>
                  <span className="w-24 text-right text-sm tabular-nums">{inr(priceOf(p))}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScanBar;
