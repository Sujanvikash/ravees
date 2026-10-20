import { ArrowRight, Phone } from 'lucide-react';
import { countLabel, gstLines } from '../lib/bill.js';
import { phoneDigits } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Kbd from './Kbd.jsx';
import PaymentMethods from './PaymentMethods.jsx';

const Row = ({ label, value, className = 'text-ink-2' }) => (
  <div className={`flex justify-between gap-4 ${className}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/**
 * The right-hand order panel: customer number, the bill's breakdown, then the total, payment method and
 * Collect pinned at the bottom. On a counter monitor it runs the full height beside the bill.
 */
const OrderPanel = ({ bill, phone, onPhone, phoneRef, method, onMethod, onCollect }) => {
  const known = phoneDigits(phone).length === 10;
  return (
    <aside className="flex min-h-0 flex-col border-t border-line bg-surface lg:w-96 lg:border-t-0 lg:border-l xl:w-[26rem]">
      <section className="border-b border-line-soft p-5">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="customer-phone" className="text-[13px] font-medium">
            Customer
          </label>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            {known ? 'Saved with this bill' : 'Walk-in'} <Kbd>F4</Kbd>
          </span>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]">
          <Phone size={15} className="text-ink-3" aria-hidden="true" />
          <input
            id="customer-phone"
            ref={phoneRef}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            placeholder="Mobile number (optional)"
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
          />
        </div>
      </section>

      <section aria-label="Bill summary" className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-2 text-[13px]">
          <Row label="MRP total" value={inr(bill.mrpTotal)} />
          <Row label="Offer discount" value={inr(-bill.savings)} className={bill.savings > 0 ? 'text-ok-ink' : 'text-ink-2'} />
          <div className="my-1 h-px bg-line-soft" />
          <Row label="Taxable value" value={inr(bill.taxable)} />
          {gstLines(bill.gstRows).map((g) => (
            <Row key={g.label} label={g.label} value={inr(g.value)} />
          ))}
          <Row label="Round off" value={inr(bill.roundOff)} />
        </div>
      </section>

      <section className="border-t border-line-soft bg-mist-2 p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="text-[13px] text-ink-3">
            <div className="font-medium text-ink-2">Total</div>
            {countLabel(bill)} · incl. GST
          </div>
          <div className="text-[34px] leading-none font-semibold tracking-tight tabular-nums">{inr(bill.payable)}</div>
        </div>

        <div className="mt-4">
          <PaymentMethods value={method} onChange={onMethod} />
        </div>

        <button
          type="button"
          onClick={onCollect}
          disabled={!bill.count}
          className="group mt-3 flex h-12 w-full items-center justify-between rounded-xl bg-evergreen-800 px-4 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
        >
          <span className="flex items-center gap-2">
            Collect payment
            <ArrowRight size={16} className="transition-transform group-enabled:group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <Kbd tone="dark" className="group-disabled:border-line group-disabled:bg-transparent group-disabled:text-ink-3">
            F12
          </Kbd>
        </button>
      </section>
    </aside>
  );
};

export default OrderPanel;
