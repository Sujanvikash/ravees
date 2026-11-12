import { useState } from 'react';
import { Check, HandCoins } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { countLabel } from '../lib/bill.js';
import { customerLabel, isValidMobile, isValidName } from '../lib/customer.js';
import { inr, parseAmount } from '../lib/money.js';
import Dialog from './Dialog.jsx';
import Kbd from './Kbd.jsx';
import { usePaymentEntry } from '../hooks/usePaymentEntry.js';
import { field, label, PaymentFields, Switch } from './PaymentFields.jsx';
import PaymentMethods from './PaymentMethods.jsx';

/**
 * Takes the payment for the bill. Enter completes the sale once the amount is enough.
 *
 * "Credit bill" lets the customer pay part now (or nothing) and the rest later: what is typed under "Paying now"
 * is taken by the chosen method, and the balance is kept on the bill to collect from Sales or Credit bills. A
 * credit bill needs the customer's name and mobile, whatever the store's settings, so the balance can be chased.
 */
const PaymentDialog = ({ bill, billNo, upiId, method, onMethod, phone, name, onBack, onComplete }) => {
  const due = bill.payable;
  const { showGst, composition } = useStore().settings;
  const gst = showGst && !composition; // a composition dealer's bill shows no GST
  const [print, setPrint] = useState(true);
  const [onCredit, setOnCredit] = useState(false);
  const [nowText, setNowText] = useState('');

  const payNow = onCredit ? Math.min(Math.max(parseAmount(nowText), 0), due) : due;
  const later = Math.round((due - payNow) * 100) / 100;
  const entry = usePaymentEntry(payNow, method);
  const customerOk = isValidMobile(phone) && isValidName(name);
  const creditProblem = !onCredit
    ? ''
    : !customerOk
      ? 'A credit bill needs the customer’s name and mobile number. Go back and fill them in.'
      : later <= 0
        ? 'Paying the whole amount now: turn Credit bill off, or enter less.'
        : '';
  const valid = entry.valid && !creditProblem;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onComplete({ ...entry.details(), later: onCredit ? later : 0, print });
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
              {bill.discount > 0 && (
                <span className="text-ok-ink">
                  Discount {inr(bill.discount)}
                  {bill.discountKind === 'percent' && ` (${bill.discountValue}%)`}
                </span>
              )}
              {gst && <span>GST {inr(bill.tax)} included</span>}
            </div>
          </div>

          <div className={`rounded-2xl border ${onCredit ? 'border-warn-ink/30 bg-warn-50/50' : 'border-line-soft'} px-4 py-3`}>
            <Switch checked={onCredit} onChange={setOnCredit}>
              <span className="flex items-center gap-1.5 font-medium text-ink">
                <HandCoins size={15} aria-hidden="true" /> Credit bill
              </span>
              <span className="text-ink-3">· customer pays the rest later</span>
            </Switch>
            {onCredit && (
              <div className="mt-3 grid animate-pop grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pay-now" className={label}>
                    Paying now
                  </label>
                  <div className={`${field} h-12 px-3`}>
                    <span className="text-ink-3">₹</span>
                    <input
                      id="pay-now"
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      autoComplete="off"
                      value={nowText}
                      onChange={(e) => setNowText(e.target.value)}
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent text-lg font-semibold tabular-nums placeholder:font-normal placeholder:text-ink-3/70"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end rounded-xl bg-warn-50 px-3 py-2 text-warn-ink">
                  <span className="text-xs font-medium">Balance on credit</span>
                  <span className="text-xl font-semibold tabular-nums">{inr(later)}</span>
                </div>
                {creditProblem && (
                  <p role="alert" className="col-span-2 text-xs font-medium text-ruby-ink">
                    {creditProblem}
                  </p>
                )}
              </div>
            )}
          </div>

          {payNow > 0 ? (
            <>
              <PaymentMethods value={method} onChange={onMethod} />
              {/* they appear as a credit bill's "Paying now" is typed: the cursor stays in it */}
              <PaymentFields key={method} due={payNow} method={method} upiId={upiId} entry={entry} focus={document.activeElement?.id !== 'pay-now'} />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-2">
              Nothing is paid now: the whole {inr(due)} goes on credit against {name.trim() || 'the customer'}.
            </p>
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
              {onCredit ? 'Complete credit sale' : 'Complete sale'} <Kbd tone="dark">Enter</Kbd>
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default PaymentDialog;
