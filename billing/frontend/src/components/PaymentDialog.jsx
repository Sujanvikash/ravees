import { useState } from 'react';
import { Check } from 'lucide-react';
import { STORE } from '../config.js';
import { countLabel } from '../lib/bill.js';
import { customerLabel } from '../lib/customer.js';
import { inr, inrWhole, parseAmount } from '../lib/money.js';
import Dialog from './Dialog.jsx';
import Kbd from './Kbd.jsx';
import PaymentMethods from './PaymentMethods.jsx';

/** Exact, then the next round notes up: for ₹31,640 → Exact, ₹31,700, ₹32,000, ₹35,000. */
const quickAmounts = (due) => {
  const ups = [due, ...[100, 500, 1000, 5000].map((step) => Math.ceil(due / step) * step)];
  return [...new Set(ups)].slice(0, 4);
};

const field =
  'flex items-center gap-2 rounded-xl border border-line bg-surface px-4 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_4px_rgba(23,92,38,0.10)]';
const label = 'mb-1.5 block text-[13px] font-medium text-ink-2';

/** An on/off switch with its label, for "Print receipt". */
const Switch = ({ checked, onChange, children }) => (
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

/** Takes the payment for the bill. Enter completes the sale once the amount is enough. */
const PaymentDialog = ({ bill, billNo, method, onMethod, phone, name, onBack, onComplete }) => {
  const due = bill.payable;
  const [tendered, setTendered] = useState('');
  const [approval, setApproval] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [print, setPrint] = useState(true);

  // Cash left blank means the customer gave the exact amount.
  const received = tendered.trim() ? parseAmount(tendered) : due;
  const change = received - due;
  const cashPart = Math.min(parseAmount(splitCash), due);
  const valid =
    method === 'cash' ? change >= 0 : method === 'split' ? cashPart > 0 && cashPart < due : true;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onComplete({
      method,
      received: method === 'cash' ? received : due,
      change: method === 'cash' ? change : 0,
      approval: method === 'card' ? approval.trim() : '',
      split: method === 'split' ? { cash: cashPart, upi: due - cashPart } : null,
      print,
    });
  };

  return (
    <Dialog id="pay" title="Collect payment" subtitle={`${billNo} · ${countLabel(bill)}`} onClose={onBack} size="max-w-[34rem]">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-5 px-6 pb-6">
          <div className="rounded-2xl bg-mist-2 px-5 py-4 ring-1 ring-line-soft">
            <div className="text-[13px] text-ink-3">Amount due</div>
            <div className="mt-0.5 text-[44px] leading-tight font-semibold tracking-tight tabular-nums">{inr(due)}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
              <span>{customerLabel(phone, name)}</span>
              {bill.savings > 0 && <span className="text-ok-ink">Customer saves {inr(bill.savings)}</span>}
              <span>GST {inr(bill.tax)} included</span>
            </div>
          </div>

          <PaymentMethods value={method} onChange={onMethod} />

          {method === 'cash' && (
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="tendered" className={label}>
                  Cash received
                </label>
                <div className={`${field} h-14`}>
                  <span className="text-xl text-ink-3">₹</span>
                  <input
                    id="tendered"
                    type="text"
                    inputMode="decimal"
                    autoFocus
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
          )}

          {method === 'upi' && (
            <div className="rounded-xl border border-dashed border-line-strong p-4 text-[13px] text-ink-2">
              <div className="font-medium text-ink">Ask the customer to pay {inr(due)} by UPI</div>
              <div className="mt-1">
                UPI ID: <span className="font-mono text-ink">{STORE.upiId || 'not set yet (src/config.js)'}</span>
              </div>
              <div className="mt-1 text-ink-3">Complete the sale once the payment shows as received.</div>
            </div>
          )}

          {method === 'card' && (
            <div>
              <p className="mb-3 text-[13px] text-ink-2">
                Ask the customer to tap or insert their card on the card machine, then enter the approval code.
              </p>
              <label htmlFor="approval" className={label}>
                Approval code <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <div className={`${field} h-12`}>
                <input
                  id="approval"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={approval}
                  onChange={(e) => setApproval(e.target.value)}
                  placeholder="e.g. 4F7K21"
                  className="min-w-0 flex-1 bg-transparent font-mono text-base placeholder:text-ink-3/70"
                />
              </div>
            </div>
          )}

          {method === 'split' && (
            <div className="flex flex-col gap-2.5">
              <div>
                <label htmlFor="split-cash" className={label}>
                  Cash part
                </label>
                <div className={`${field} h-12`}>
                  <span className="text-lg text-ink-3">₹</span>
                  <input
                    id="split-cash"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    autoComplete="off"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-medium tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-between rounded-xl bg-mist-2 px-4 py-3 text-[13px] text-ink-2 ring-1 ring-line-soft">
                <span>UPI / card for the rest</span>
                <span className="font-medium text-ink tabular-nums">{inr(Math.max(due - cashPart, 0))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
          <Switch checked={print} onChange={setPrint}>
            Print receipt
          </Switch>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
            >
              Back <Kbd>Esc</Kbd>
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
            >
              <Check size={16} strokeWidth={2.4} />
              Complete sale <Kbd tone="dark">Enter</Kbd>
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default PaymentDialog;
