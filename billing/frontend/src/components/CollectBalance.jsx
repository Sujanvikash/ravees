import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Printer } from 'lucide-react';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { customerLabel } from '../lib/customer.js';
import { inr, parseAmount } from '../lib/money.js';
import { daysSince, paidSoFar } from '../lib/payment.js';
import { printAlone } from '../lib/print.js';
import { newId } from '../lib/uid.js';
import Dialog from './Dialog.jsx';
import { usePaymentEntry } from '../hooks/usePaymentEntry.js';
import { field, label, PaymentFields, Switch } from './PaymentFields.jsx';
import PaymentMethods from './PaymentMethods.jsx';
import PaymentReceiptPrint from './PaymentReceiptPrint.jsx';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Takes a payment towards a credit bill's balance: all of it (the default) or part, by cash, UPI, card or a split,
 * then shows what to hand back and what is still owed, and prints a payment receipt. Used from Sales and from
 * Credit bills. The payment's id is made once, so a retry after a dropped connection is never collected twice.
 */
const CollectBalance = ({ sale, onClose }) => {
  const { collectBalance } = useStore();
  const balance = sale.balance;
  const [amountText, setAmountText] = useState(String(balance));
  const [method, setMethod] = useState('cash');
  const [print, setPrint] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { sale, collection } once saved
  const [printJob, setPrintJob] = useState(0);
  const id = useRef(newId());

  const amount = Math.round(parseAmount(amountText) * 100) / 100;
  const entry = usePaymentEntry(amount, method);
  const amountProblem = amount <= 0 ? 'Enter the amount the customer is paying.' : amount > balance ? `Only ${inr(balance)} is owed on this bill.` : '';
  const valid = !amountProblem && entry.valid && !busy;

  useEffect(() => {
    if (printJob) printAlone();
  }, [printJob]);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const updated = await collectBalance(sale.id, { id: id.current, amount, payment: { ...entry.details(), print } });
      setDone({ sale: updated, collection: updated.collections.find((c) => c.id === id.current) ?? updated.collections.at(-1) });
      if (print) setPrintJob((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  if (done) {
    const { collection } = done;
    const left = done.sale.balance;
    return (
      <Dialog id="collected" size="max-w-sm">
        <div className="flex flex-col items-center px-6 pt-7 pb-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-evergreen-800 text-white shadow-[0_0_0_6px_var(--color-evergreen-50)]">
            <Check size={24} strokeWidth={2.6} />
          </div>
          <h2 id="collected-title" className="mt-4 text-lg font-semibold tracking-tight">
            {inr(collection.amount)} received
          </h2>
          <div className="mt-0.5 text-[13px] text-ink-3">
            <span className="font-mono text-xs">{collection.receiptNo}</span> · against <span className="font-mono text-xs">{sale.billNo}</span>
          </div>
          {collection.payment.change > 0 && (
            <div className="mt-5 w-full rounded-2xl bg-evergreen-50 px-4 py-3.5">
              <div className="text-[13px] font-medium text-evergreen-900">Give change</div>
              <div className="text-[34px] leading-tight font-semibold tracking-tight text-evergreen-900 tabular-nums">{inr(collection.payment.change)}</div>
            </div>
          )}
          <div className={`mt-3 w-full rounded-2xl px-4 py-3 ${left > 0 ? 'bg-warn-50 text-warn-ink' : 'bg-mist text-ink-2'}`}>
            <div className="text-[13px] font-medium">{left > 0 ? 'Still owed on this bill' : 'This bill is now paid in full'}</div>
            {left > 0 && <div className="text-2xl font-semibold tabular-nums">{inr(left)}</div>}
          </div>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrintJob((n) => n + 1)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
            >
              <Printer size={15} /> Print receipt
            </button>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900"
            >
              Done
            </button>
          </div>
        </div>
        {createPortal(<PaymentReceiptPrint sale={done.sale} collection={collection} />, document.body)}
      </Dialog>
    );
  }

  return (
    <Dialog
      id="collect"
      title="Collect balance"
      subtitle={`${sale.billNo} · ${customerLabel(sale.phone, sale.name)}`}
      onClose={onClose}
      size="max-w-[34rem]"
    >
      <form onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="flex flex-col gap-5 px-6 pb-6">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-line-soft ring-1 ring-line-soft">
            {[
              ['Bill amount', inr(sale.totals.payable), `${day.format(new Date(sale.at))} · ${daysSince(sale.at)} days ago`],
              ['Paid so far', inr(paidSoFar(sale)), `${(sale.collections ?? []).length} later payments`],
              ['Owed now', inr(balance), 'balance due'],
            ].map(([name, value, note], i) => (
              <div key={name} className={`px-4 py-3 ${i === 2 ? 'bg-warn-50 text-warn-ink' : 'bg-mist-2'}`}>
                <div className="text-xs opacity-80">{name}</div>
                <div className="text-lg font-semibold tabular-nums">{value}</div>
                <div className="truncate text-[11px] opacity-70">{note}</div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="collect-amount" className={label}>
              Amount paying now
            </label>
            <div className="flex items-center gap-2">
              <div className={`${field} h-12 flex-1 px-3`}>
                <span className="text-ink-3">₹</span>
                <input
                  id="collect-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  aria-invalid={amountProblem ? true : undefined}
                  className="min-w-0 flex-1 bg-transparent text-lg font-semibold tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={() => setAmountText(String(balance))}
                className="h-12 shrink-0 rounded-xl border border-line px-3 text-[13px] font-medium text-ink-2 hover:bg-mist"
              >
                Full {inr(balance)}
              </button>
            </div>
            <p className={`mt-1.5 text-xs ${amountProblem ? 'font-medium text-ruby-ink' : 'text-ink-3'}`}>
              {amountProblem || (amount < balance ? `${inr(balance - amount)} will still be owed after this.` : 'Clears the bill.')}
            </p>
          </div>

          <PaymentMethods value={method} onChange={setMethod} />
          {amount > 0 && <PaymentFields key={method} idPrefix="collect" due={amount} method={method} upiId={locationById(sale.location)?.upiId} entry={entry} focus={document.activeElement?.id !== 'collect-amount'} />}

          {error && (
            <p role="alert" className="text-xs font-medium text-ruby-ink">
              Not saved: {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
          <Switch checked={print} onChange={setPrint}>
            Print receipt
          </Switch>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
            >
              <Check size={16} strokeWidth={2.4} /> {busy ? 'Saving…' : `Receive ${inr(amount)}`}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default CollectBalance;
