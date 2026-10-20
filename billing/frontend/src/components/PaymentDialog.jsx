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
  'flex items-center gap-2 rounded-xl border-2 border-line-strong px-4 focus-within:border-pine-700';

/** Takes the payment for the bill. Enter completes the sale once the amount is enough. */
const PaymentDialog = ({ bill, billNo, method, onMethod, phone, onBack, onComplete }) => {
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
    <Dialog id="pay" title="Collect payment" subtitle={`${billNo} · ${countLabel(bill)}`} onClose={onBack}>
      <form onSubmit={submit} className="flex flex-wrap">
        <div className="flex flex-[1_1_340px] flex-col gap-4.5 p-6">
          <div>
            <div className="text-xs font-semibold tracking-[0.08em] text-ink-2 uppercase">Amount due</div>
            <div className="font-mono text-[40px] font-semibold tracking-tight text-pine-950">{inr(due)}</div>
          </div>

          <PaymentMethods value={method} onChange={onMethod} compact />

          {method === 'cash' && (
            <div className="flex flex-col gap-3">
              <label htmlFor="tendered" className="text-[13px] font-semibold text-ink-2">
                Cash received
              </label>
              <div className={`${field} h-14`}>
                <span className="font-mono text-[22px] text-ink-2">₹</span>
                <input
                  id="tendered"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  autoComplete="off"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder={String(due)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-semibold placeholder:text-ink-3"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts(due).map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered(String(v))}
                    className="h-11 rounded-[10px] border border-line font-mono text-sm font-medium hover:border-pine-700"
                  >
                    {i === 0 ? 'Exact' : inrWhole(v)}
                  </button>
                ))}
              </div>
              <div
                className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${
                  change >= 0 ? 'bg-gold-50 text-pine-950' : 'bg-ruby-50 text-ruby-ink'
                }`}
              >
                <span className="text-sm font-semibold">{change >= 0 ? 'Change to return' : 'Still to collect'}</span>
                <span className="font-mono text-[26px] font-semibold">{inr(Math.abs(change))}</span>
              </div>
            </div>
          )}

          {method === 'upi' && (
            <div className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-ink-2">
              <div className="font-bold text-ink">Ask the customer to pay {inr(due)} by UPI</div>
              <div className="mt-1">
                UPI ID: <span className="font-mono text-ink">{STORE.upiId || 'not set yet (src/config.js)'}</span>
              </div>
              <div className="mt-1">Complete the sale once the payment shows as received.</div>
            </div>
          )}

          {method === 'card' && (
            <div className="flex flex-col gap-2.5">
              <div className="text-sm text-ink-2">
                Ask the customer to tap or insert their card on the card machine, then enter the approval code.
              </div>
              <label htmlFor="approval" className="text-[13px] font-semibold text-ink-2">
                Approval code (optional)
              </label>
              <div className={`${field} h-13`}>
                <input
                  id="approval"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={approval}
                  onChange={(e) => setApproval(e.target.value)}
                  placeholder="e.g. 4F7K21"
                  className="min-w-0 flex-1 bg-transparent font-mono text-lg placeholder:text-ink-3"
                />
              </div>
            </div>
          )}

          {method === 'split' && (
            <div className="flex flex-col gap-2.5">
              <label htmlFor="split-cash" className="text-[13px] font-semibold text-ink-2">
                Cash part
              </label>
              <div className={`${field} h-13`}>
                <span className="font-mono text-lg text-ink-2">₹</span>
                <input
                  id="split-cash"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  autoComplete="off"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-lg"
                />
              </div>
              <div className="flex justify-between rounded-[10px] border border-line px-3.5 py-3 text-sm text-ink-2">
                <span>UPI / card for the rest</span>
                <span className="font-mono text-ink">{inr(Math.max(due - cashPart, 0))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-[1_1_260px] flex-col gap-3.5 border-l border-line bg-mist-2 p-6">
          <div className="text-[13px] font-semibold text-ink-2">Receipt</div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} className="size-4.5 accent-pine-700" />
            Print receipt
          </label>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-2 text-[13px] text-ink-2">
            <div className="flex justify-between">
              <span>Customer</span>
              <span className="text-ink">{customerLabel(phone)}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer saved</span>
              <span className="font-mono text-ok">{inr(bill.savings)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST included</span>
              <span className="font-mono text-ink">{inr(bill.tax)}</span>
            </div>
          </div>
          <div className="flex-1" />
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-pine-950 text-base font-bold text-gold-300 hover:bg-pine-900 disabled:bg-line disabled:text-ink-3"
          >
            <Check size={18} strokeWidth={2.4} />
            Complete sale <Kbd className="text-current!">Enter</Kbd>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-xl border border-line bg-surface text-sm font-semibold hover:bg-mist"
          >
            Back to bill <Kbd>Esc</Kbd>
          </button>
        </div>
      </form>
    </Dialog>
  );
};

export default PaymentDialog;
