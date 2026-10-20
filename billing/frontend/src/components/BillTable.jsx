import { Minus, Plus, ScanBarcode, X } from 'lucide-react';
import { inr } from '../lib/money.js';

const cell = 'border-t border-line-soft px-3 py-2';
const head = 'sticky top-0 z-[1] bg-mist-2 py-2 font-semibold';
const stepper = 'inline-flex size-8 items-center justify-center rounded-lg bg-mist text-ink hover:bg-line';

/**
 * The lines of the current bill: code, product, price (with the MRP struck through on offers), qty, amount.
 * It fills the space left in its card and scrolls inside it, with the column headings pinned.
 */
const BillTable = ({ lines, lastCode, onQty }) => {
  if (!lines.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-evergreen-50 text-evergreen-800">
          <ScanBarcode size={26} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="text-base font-bold">Scan an item to start the bill</div>
        <div className="max-w-105 text-[13px] text-ink-3">
          Point the scanner at a tag, or type a product code like TR0278 and press Enter.
        </div>
      </div>
    );
  }

  return (
    // relative: keeps the absolutely positioned sr-only header inside the scroll box.
    <div className="relative min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-180 border-collapse">
        <thead>
          <tr className="text-[11px] tracking-[0.06em] text-ink-2 uppercase">
            <th scope="col" className={`${head} w-10 pl-4 text-left`}>#</th>
            <th scope="col" className={`${head} w-22 px-3 text-left`}>Code</th>
            <th scope="col" className={`${head} px-3 text-left`}>Product</th>
            <th scope="col" className={`${head} w-32 px-3 text-right`}>Price</th>
            <th scope="col" className={`${head} w-34 px-3 text-center`}>Qty</th>
            <th scope="col" className={`${head} w-30 px-3 text-right`}>Amount</th>
            <th scope="col" className={`${head} w-12 pr-4`}>
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const { product: p } = line;
            const isLast = p.code === lastCode;
            const off = p.offer ? Math.round((1 - p.offer / p.mrp) * 100) : 0;
            return (
              <tr key={p.code} className={isLast ? 'bg-evergreen-50' : 'hover:bg-mist-2'}>
                <td className={`${cell} pl-4 font-mono text-xs text-ink-3`}>{i + 1}</td>
                <td className={`${cell} font-mono text-[13px] font-semibold text-evergreen-800`}>{p.code}</td>
                <td className={cell}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {isLast && (
                      <span className="rounded-full bg-raave-red-50 px-1.5 py-px text-[10px] font-bold tracking-wide text-raave-red-ink">
                        JUST SCANNED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3">{p.dept}</div>
                </td>
                <td className={`${cell} text-right font-mono`}>
                  <div className="text-[13px]">{inr(line.price)}</div>
                  {p.offer > 0 && (
                    <div className="text-[11px] whitespace-nowrap text-ink-3">
                      <s>{inr(p.mrp)}</s> <span className="font-semibold text-ok">−{off}%</span>
                    </div>
                  )}
                </td>
                <td className={cell}>
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" className={stepper} onClick={() => onQty(p.code, line.qty - 1)} aria-label={`One less ${p.name}`}>
                      <Minus size={15} strokeWidth={2.2} />
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
                      className="w-10 rounded-md bg-transparent text-center font-mono text-[15px] font-semibold focus:bg-mist"
                    />
                    <button type="button" className={stepper} onClick={() => onQty(p.code, line.qty + 1)} aria-label={`One more ${p.name}`}>
                      <Plus size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </td>
                <td className={`${cell} text-right font-mono text-sm font-semibold`}>{inr(line.amount)}</td>
                <td className={`${cell} pr-4 text-right`}>
                  <button
                    type="button"
                    onClick={() => onQty(p.code, 0)}
                    aria-label={`Remove ${p.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-ruby hover:bg-ruby-50"
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BillTable;
