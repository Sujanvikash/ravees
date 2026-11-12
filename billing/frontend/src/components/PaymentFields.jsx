import { inr, inrWhole } from '../lib/money.js';

/** Exact, then the next round notes up: for ₹31,640 → Exact, ₹31,700, ₹32,000, ₹35,000. */
const quickAmounts = (due) => {
  const ups = [due, ...[100, 500, 1000, 5000].map((step) => Math.ceil(due / step) * step)];
  return [...new Set(ups)].slice(0, 4);
};

const SPLIT_PARTS = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
];

export const field =
  'flex items-center gap-2 rounded-xl border border-line bg-surface px-4 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_4px_rgba(23,92,38,0.10)]';
export const label = 'mb-1.5 block text-[13px] font-medium text-ink-2';

/** An on/off switch with its label, for "Print receipt" and "Credit bill". */
export const Switch = ({ checked, onChange, children }) => (
  <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2 select-none">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-evergreen-800' : 'bg-line-strong'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
    {children}
  </label>
);

/** The inputs for the chosen method, for an entry from hooks/usePaymentEntry.js. `focus` puts the cursor in the first
 *  one when they appear (off where they appear while another box is being typed in: a credit bill's "Paying now"). */
export const PaymentFields = ({ due, method, upiId, entry, idPrefix = 'pay', focus = true }) => {
  const { tendered, setTendered, approval, setApproval, parts, setParts, change, split, splitLeft, splitValid } = entry.state;
  const id = (name) => `${idPrefix}-${name}`;

  if (method === 'cash') {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={id('tendered')} className={label}>
            Cash received
          </label>
          <div className={`${field} h-14`}>
            <span className="text-xl text-ink-3">₹</span>
            <input
              id={id('tendered')}
              type="text"
              inputMode="decimal"
              autoFocus={focus}
              autoComplete="off"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder={String(due)}
              className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums placeholder:font-normal placeholder:text-ink-3/70"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickAmounts(due).map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setTendered(String(v))}
              className="h-8 rounded-full border border-line px-3.5 text-[13px] font-medium tabular-nums transition-colors hover:border-ink-3 hover:bg-mist"
            >
              {i === 0 ? 'Exact' : inrWhole(v)}
            </button>
          ))}
        </div>
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            change >= 0 ? 'bg-evergreen-50 text-evergreen-900' : 'bg-ruby-50 text-ruby-ink'
          }`}
        >
          <span className="text-[13px] font-medium">{change >= 0 ? 'Change to return' : 'Still to collect'}</span>
          <span className="text-2xl font-semibold tabular-nums">{inr(Math.abs(change))}</span>
        </div>
      </div>
    );
  }

  if (method === 'upi') {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-4 text-[13px] text-ink-2">
        <div className="font-medium text-ink">Ask the customer to pay {inr(due)} by UPI</div>
        <div className="mt-1">
          UPI ID: <span className="font-mono text-ink">{upiId || 'not set yet (src/config.js)'}</span>
        </div>
        <div className="mt-1 text-ink-3">Complete once the payment shows as received.</div>
      </div>
    );
  }

  if (method === 'card') {
    return (
      <div>
        <p className="mb-3 text-[13px] text-ink-2">
          Ask the customer to tap or insert their card on the card machine for {inr(due)}, then enter the approval code.
        </p>
        <label htmlFor={id('approval')} className={label}>
          Approval code <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <div className={`${field} h-12`}>
          <input
            id={id('approval')}
            type="text"
            autoFocus={focus}
            autoComplete="off"
            value={approval}
            onChange={(e) => setApproval(e.target.value)}
            placeholder="e.g. 4F7K21"
            className="min-w-0 flex-1 bg-transparent font-mono text-base placeholder:text-ink-3/70"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {SPLIT_PARTS.map(({ id: part, label: name }, i) => (
          <div key={part}>
            <label htmlFor={id(`split-${part}`)} className={label}>
              {name}
            </label>
            <div className={`${field} h-12 px-3`}>
              <span className="text-ink-3">₹</span>
              <input
                id={id(`split-${part}`)}
                type="text"
                inputMode="decimal"
                autoFocus={focus && i === 0}
                autoComplete="off"
                value={parts[part]}
                onChange={(e) => setParts((p) => ({ ...p, [part]: e.target.value }))}
                onFocus={() => {
                  // an empty box after the first takes what is still left, so the last part needs no typing
                  if (i > 0 && !parts[part].trim() && splitLeft > 0) setParts((p) => ({ ...p, [part]: String(splitLeft) }));
                }}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent text-base font-medium tabular-nums placeholder:font-normal placeholder:text-ink-3/70"
              />
            </div>
          </div>
        ))}
      </div>
      <div
        className={`flex justify-between rounded-xl px-4 py-3 text-[13px] ${
          splitValid ? 'bg-evergreen-50 text-evergreen-900' : 'bg-ruby-50 text-ruby-ink'
        }`}
      >
        <span className="font-medium">
          {splitLeft > 0
            ? 'Still to collect'
            : splitLeft < 0
              ? 'More than the amount due'
              : splitValid
                ? 'Adds up to the amount due'
                : 'Use at least two of cash, UPI and card'}
        </span>
        <span className="font-semibold tabular-nums">{inr(Math.abs(splitLeft))}</span>
      </div>
      {split.card > 0 && (
        <div className={`${field} h-11`}>
          <input
            type="text"
            autoComplete="off"
            aria-label="Card approval code (optional)"
            value={approval}
            onChange={(e) => setApproval(e.target.value)}
            placeholder="Card approval code (optional)"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm placeholder:font-sans placeholder:text-ink-3/70"
          />
        </div>
      )}
    </div>
  );
};
