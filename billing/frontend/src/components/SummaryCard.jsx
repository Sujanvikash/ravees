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

/** Totals, the payment method and the Collect button. */
const SummaryCard = ({ bill, method, onMethod, onCollect }) => (
  <section className="rounded-2xl border border-line bg-surface px-5 py-4.5">
    <h2 className="mb-3.5 text-[15px] font-bold">Bill summary</h2>
    <div className="flex flex-col gap-2.5">
      <Row label="MRP total" value={inr(bill.mrpTotal)} />
      <Row label="Offer discount" value={inr(-bill.savings)} className="font-semibold text-ok" />
      <div className="h-px bg-line-soft" />
      <Row label="Taxable value" value={inr(bill.taxable)} />
      {gstLines(bill.gstRows).map((g) => (
        <Row key={g.label} label={g.label} value={inr(g.value)} />
      ))}
      <Row label="Round off" value={inr(bill.roundOff)} />
    </div>

    <div className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-[#f4f7f4] p-4">
      <div>
        <div className="text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-ink-2 uppercase">Total payable</div>
        <div className="mt-0.5 text-xs text-ink-3">{countLabel(bill)} · incl. GST</div>
      </div>
      <div className="font-mono text-[32px] font-semibold tracking-tight text-pine-950">{inr(bill.payable)}</div>
    </div>

    <div className="mt-4.5 mb-2.5 text-[13px] font-semibold text-ink-2">Payment method</div>
    <PaymentMethods value={method} onChange={onMethod} />

    <button
      type="button"
      onClick={onCollect}
      disabled={!bill.count}
      className="mt-4 flex h-15 w-full items-center justify-center gap-3 rounded-xl bg-pine-950 text-[17px] font-bold text-gold-300 hover:bg-pine-900 disabled:bg-line disabled:text-ink-3"
    >
      Collect {inr(bill.payable)}
      <Kbd className="rounded-md bg-gold-300/15 px-2 py-0.5 text-current!">F12</Kbd>
    </button>
  </section>
);

export default SummaryCard;
