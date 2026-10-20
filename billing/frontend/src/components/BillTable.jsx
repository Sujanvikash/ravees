import { Minus, Plus, ScanBarcode, X } from 'lucide-react';
import { inr } from '../lib/money.js';

const cell = 'border-t border-line-soft px-3 py-3.5';
const stepper = 'inline-flex size-9 items-center justify-center rounded-[9px] bg-mist text-ink hover:bg-line';

/** The lines of the current bill: code, product, price (with the MRP struck through on offers), qty, amount. */
const BillTable = ({ lines, lastCode, onQty }) => {
  if (!lines.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-18 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-evergreen-50 text-evergreen-800">
          <ScanBarcode size={30} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="text-lg font-bold">Scan an item to start the bill</div>
        <div className="max-w-105 text-sm text-ink-3">
          Point the scanner at a tag, or type a product code like TR0278 and press Enter.
        </div>
      </div>
    );
  }

  return (
    // relative: keeps the absolutely positioned sr-only header inside the scroll box on narrow screens.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-195 border-collapse">
        <thead>
          <tr className="bg-mist-2 text-xs tracking-[0.06em] text-ink-2 uppercase">
            <th scope="col" className="w-11 py-2.5 pl-5 text-left font-semibold">#</th>
            <th scope="col" className="w-24 px-3 py-2.5 text-left font-semibold">Code</th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">Product</th>
            <th scope="col" className="w-37.5 px-3 py-2.5 text-right font-semibold">Price</th>
            <th scope="col" className="w-37.5 px-3 py-2.5 text-center font-semibold">Qty</th>
            <th scope="col" className="w-32.5 px-3 py-2.5 text-right font-semibold">Amount</th>
            <th scope="col" className="w-14 pr-5">
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
                <td className={`${cell} pl-5 font-mono text-[13px] text-ink-3`}>{i + 1}</td>
                <td className={`${cell} font-mono text-[13px] font-semibold text-evergreen-800`}>{p.code}</td>
                <td className={cell}>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[15px] font-semibold">{p.name}</span>
                    {isLast && (
                      <span className="rounded-full bg-raave-red-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-raave-red-ink">
                        JUST SCANNED
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-3">{p.dept}</div>
                </td>
                <td className={`${cell} text-right font-mono`}>
                  <div className="text-sm">{inr(line.price)}</div>
                  {p.offer > 0 && (
                    <>
                      <div className="text-xs whitespace-nowrap text-ink-3">
                        <s>{inr(p.mrp)}</s>
                      </div>
                      <div className="text-xs font-semibold text-ok">{off}% off</div>
                    </>
                  )}
                </td>
                <td className={cell}>
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" className={stepper} onClick={() => onQty(p.code, line.qty - 1)} aria-label={`One less ${p.name}`}>
                      <Minus size={16} strokeWidth={2.2} />
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
                      className="w-12 rounded-md bg-transparent text-center font-mono text-base font-semibold focus:bg-mist"
                    />
                    <button type="button" className={stepper} onClick={() => onQty(p.code, line.qty + 1)} aria-label={`One more ${p.name}`}>
                      <Plus size={16} strokeWidth={2.2} />
                    </button>
                  </div>
                </td>
                <td className={`${cell} text-right font-mono text-[15px] font-semibold`}>{inr(line.amount)}</td>
                <td className={`${cell} pr-5 text-right`}>
                  <button
                    type="button"
                    onClick={() => onQty(p.code, 0)}
                    aria-label={`Remove ${p.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-[9px] text-ruby hover:bg-ruby-50"
                  >
                    <X size={17} />
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
