import { countLabel, gstLines } from '../lib/bill.js';
import { inr } from '../lib/money.js';
import Kbd from './Kbd.jsx';
import PaymentMethods from './PaymentMethods.jsx';

const Row = ({ label, value, className = 'text-ink-2' }) => (
  <div className={`flex justify-between ${className}`}>
    <span>{label}</span>
    <span className="font-mono">{value}</span>
  </div>
);

/**
 * Totals, the payment method and the Collect button. It takes the panel's remaining height: the
 * breakdown scrolls if the window is very short, and Collect always stays in view at the bottom.
 */
const SummaryCard = ({ bill, method, onMethod, onCollect }) => (
  <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface p-4">
    <div className="min-h-0 flex-1 overflow-y-auto">
      <h2 className="mb-2 text-sm font-bold">Bill summary</h2>
      <div className="flex flex-col gap-1.5 text-[13px]">
        <Row label="MRP total" value={inr(bill.mrpTotal)} />
        <Row label="Offer discount" value={inr(-bill.savings)} className="font-semibold text-ok" />
        <div className="h-px bg-line-soft" />
        <Row label="Taxable value" value={inr(bill.taxable)} />
        {gstLines(bill.gstRows).map((g) => (
          <Row key={g.label} label={g.label} value={inr(g.value)} />
        ))}
        <Row label="Round off" value={inr(bill.roundOff)} />
      </div>
    </div>

    <div className="mt-3 flex items-end justify-between gap-3 rounded-lg bg-[#f4f7f4] px-3.5 py-3">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-2 uppercase">Total payable</div>
        <div className="text-[11px] text-ink-3">{countLabel(bill)} · incl. GST</div>
      </div>
      <div className="font-mono text-[26px] leading-none font-semibold tracking-tight text-ink">{inr(bill.payable)}</div>
    </div>

    <div className="mt-3">
      <PaymentMethods value={method} onChange={onMethod} />
    </div>

    <button
      type="button"
      onClick={onCollect}
      disabled={!bill.count}
      className="mt-3 flex h-12 w-full shrink-0 items-center justify-center gap-2.5 rounded-lg bg-evergreen-800 text-base font-bold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3"
    >
      Collect {inr(bill.payable)}
      <Kbd className="rounded bg-white/15 px-1.5 py-px text-current!">F12</Kbd>
    </button>
  </section>
);

export default SummaryCard;
