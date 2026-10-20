import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, ScanBarcode, TriangleAlert } from 'lucide-react';
import { SEASON, SEASON_COUNT, PRODUCTS, findProduct, searchProducts } from '../lib/catalogue.js';
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
  const tone = notice && NOTICE[notice.tone];

  return (
    <div className="relative">
      <label
        htmlFor="scan"
        className="flex h-14 cursor-text items-center gap-3 rounded-2xl border border-line bg-surface pr-2 pl-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_4px_rgba(23,92,38,0.10)]"
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
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            onNotice(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Scan a barcode, or search by code or name"
          className="min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-3"
        />
        <Kbd className="hidden sm:inline-flex">F2</Kbd>
        <div role="group" aria-label="Product range" className="hidden shrink-0 gap-0.5 rounded-xl bg-mist p-0.5 sm:flex">
          {scopes.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={s.on}
              onClick={s.pick}
              disabled={s.disabled}
              title={s.disabled ? `No products are marked “In Season ${SEASON}” yet` : undefined}
              className={`h-8 rounded-[10px] px-2.5 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
                s.on ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(9,9,11,0.08)]' : 'text-ink-3 enabled:hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </label>

      <div className="mt-2 flex h-5 items-center gap-3 px-1 text-xs text-ink-3">
        {tone ? (
          <span role="status" key={notice.text} className={`inline-flex animate-pop items-center gap-1.5 font-medium ${tone.className}`}>
            <tone.Icon size={14} aria-hidden="true" />
            {notice.text}
          </span>
        ) : (
          <span>
            {seasonOnly
              ? `${SEASON_COUNT.toLocaleString('en-IN')} Season ${SEASON} products`
              : `${PRODUCTS.length.toLocaleString('en-IN')} products`}{' '}
            · ↑ ↓ to choose a match, Enter to add
          </span>
        )}
      </div>

      {matches.length > 0 && (
        <div className="absolute inset-x-0 top-15 z-10 animate-pop overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_-8px_rgba(9,9,11,0.18)]">
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
                className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-3 py-2 ${
                  i === active ? 'bg-mist' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="hidden truncate text-xs text-ink-3 sm:inline">{p.dept}</span>
                </span>
                <span className="text-sm tabular-nums">{inr(priceOf(p))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScanBar;
