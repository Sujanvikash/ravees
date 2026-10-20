import { Minus, Plus, ScanBarcode, X } from 'lucide-react';
import { inr } from '../lib/money.js';
import Kbd from './Kbd.jsx';

const stepButton = 'inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist hover:text-ink';
// Phones stack each line (name, then qty and amount); from sm up it is one row of four columns.
const cols = 'sm:grid sm:grid-cols-[minmax(0,1fr)_auto_7.5rem_2rem] sm:items-center sm:gap-4';

/**
 * The lines of the current bill. It fills the space left in the bill area and scrolls inside it, with
 * the column labels pinned. The last scanned line is highlighted.
 */
const BillTable = ({ lines, lastCode, onQty, inStock }) => {
  if (!lines.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-ink-2 shadow-[0_1px_2px_rgba(9,9,11,0.05)]">
          <ScanBarcode size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <div className="text-[15px] font-semibold">Ready to scan</div>
          <div className="mt-1 max-w-80 text-[13px] text-ink-3">
            Scan a product tag, or type a code like TR0278 and press Enter.
          </div>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5"><Kbd>F9</Kbd> Held bills</span>
          <span className="inline-flex items-center gap-1.5"><Kbd>F4</Kbd> Customer</span>
          <span className="inline-flex items-center gap-1.5"><Kbd>F12</Kbd> Pay</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <div className={`${cols} sticky top-0 z-1 hidden bg-surface/95 px-3 py-2 text-xs text-ink-3 backdrop-blur`}>
        <span>Item</span>
        <span className="w-28 text-center">Qty</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <ul aria-label="Bill items" className="flex flex-col gap-0.5">
        {lines.map((line) => {
          const { product: p } = line;
          const isLast = p.code === lastCode;
          const off = p.offer ? Math.round((1 - p.offer / p.mrp) * 100) : 0;
          const stock = inStock(p.code);
          const short = line.qty > stock;
          return (
            <li
              key={p.code}
              className={`${cols} group relative isolate flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-2 ${isLast ? 'bg-evergreen-50' : 'hover:bg-mist-2'}`}
            >
              {isLast && (
                // Keyed on the qty so the flash replays when the same product is scanned again; it is its own
                // layer so the row (and a qty being typed) is never remounted.
                <span key={line.qty} aria-hidden="true" className="absolute inset-0 -z-10 animate-flash rounded-xl bg-evergreen-100 opacity-0" />
              )}
              <div className="min-w-0 basis-full sm:basis-auto">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  {isLast && <span className="shrink-0 text-[11px] font-medium text-evergreen-800">Just scanned</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs whitespace-nowrap text-ink-3 tabular-nums">
                  <span>{p.dept}</span>
                  <span aria-hidden="true">·</span>
                  <span>{inr(line.price)} each</span>
                  {p.offer > 0 && (
                    <>
                      <s className="text-ink-3/80">{inr(p.mrp)}</s>
                      <span className="rounded bg-ok-50 px-1 font-medium text-ok-ink">−{off}%</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className={short ? 'font-medium text-ruby-ink' : ''}>
                    {short ? `Only ${Math.max(stock, 0)} in stock` : `${stock} in stock`}
                  </span>
                </div>
              </div>

              <div className="flex h-8 w-28 items-center overflow-hidden rounded-lg border border-line bg-surface">
                <button type="button" className={stepButton} onClick={() => onQty(p.code, line.qty - 1)} aria-label={`One less ${p.name}`}>
                  <Minus size={14} strokeWidth={2.2} />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`Quantity of ${p.name}`}
                  value={line.qty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value.replace(/\D/g, ''), 10);
                    if (qty > 0) onQty(p.code, qty);
                  }}
                  className="h-full min-w-0 flex-1 border-x border-line bg-transparent text-center text-sm font-medium tabular-nums focus:bg-mist"
                />
                <button type="button" className={stepButton} onClick={() => onQty(p.code, line.qty + 1)} aria-label={`One more ${p.name}`}>
                  <Plus size={14} strokeWidth={2.2} />
                </button>
              </div>

              <div className="ml-auto text-right text-sm font-semibold tabular-nums sm:ml-0">{inr(line.amount)}</div>

              <button
                type="button"
                onClick={() => onQty(p.code, 0)}
                aria-label={`Remove ${p.name}`}
                className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 opacity-60 group-hover:opacity-100 hover:bg-ruby-50 hover:text-ruby focus-visible:opacity-100"
              >
                <X size={15} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BillTable;
