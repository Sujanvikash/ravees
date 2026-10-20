import { STORE } from '../config.js';
import { countLabel, gstLines } from '../lib/bill.js';
import { amount, inr } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';

const when = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const Line = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const rule = 'border-t border-dashed border-black pt-1.5';

/** The 80mm thermal tax invoice. Hidden on screen; it is the only thing that prints. */
const Receipt = ({ sale }) => {
  const { totals, payment } = sale;
  return (
    <div className="hidden font-mono text-[11px] leading-snug text-black print:block">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <div className="font-display text-[14px] font-semibold tracking-[0.2em] uppercase">{STORE.name}</div>
        {STORE.address.map((a) => (
          <div key={a}>{a}</div>
        ))}
        {STORE.phone && <div>Ph: {STORE.phone}</div>}
        {STORE.gstin && <div>GSTIN: {STORE.gstin}</div>}
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">TAX INVOICE</div>

      <Line label="Bill" value={sale.billNo} />
      <Line label="Date" value={when.format(new Date(sale.at)).replace(',', '')} />
      <Line label="Counter" value={STORE.counter} />
      <Line label="Customer" value={sale.customer} />

      <Line label="ITEM / QTY × RATE" value="AMOUNT" className={`mt-2 font-bold ${rule}`} />
      <div className="mt-1 flex flex-col gap-1.5">
        {sale.lines.map((l, i) => (
          <div key={l.code}>
            <div className="font-semibold">
              {i + 1}. {l.name}
            </div>
            <Line label={`${l.code}  ${l.qty} × ${amount(l.price)}`} value={amount(l.price * l.qty)} />
            {l.mrp > l.price && <div>MRP {amount(l.mrp)}</div>}
          </div>
        ))}
      </div>

      <div className={`mt-2 ${rule}`}>
        <div>{countLabel(totals)}</div>
        <Line label="MRP total" value={amount(totals.mrpTotal)} />
        {totals.savings > 0 && <Line label="You saved" value={amount(totals.savings)} />}
        {Math.abs(totals.roundOff) >= 0.005 && <Line label="Round off" value={amount(totals.roundOff)} />}
      </div>

      <Line label="TOTAL" value={inr(totals.payable)} className="my-2 border-y border-black py-1 text-[15px] font-bold" />

      <div className="font-bold">GST SUMMARY (incl. in price)</div>
      <Line label="Taxable value" value={amount(totals.taxable)} />
      {gstLines(totals.gstRows).map((g) => (
        <Line key={g.label} label={g.label} value={amount(g.value)} />
      ))}

      <div className={`mt-2 ${rule}`}>
        {payment.split ? (
          <>
            <Line label="Paid · Cash" value={amount(payment.split.cash)} />
            <Line label="Paid · UPI / card" value={amount(payment.split.upi)} />
          </>
        ) : (
          <Line label={`Paid · ${methodLabel(payment.method)}`} value={amount(payment.received)} />
        )}
        {payment.change > 0 && <Line label="Change" value={amount(payment.change)} className="font-bold" />}
        {payment.approval && <Line label="Card approval" value={payment.approval} />}
      </div>

      <div className={`mt-2 flex flex-col items-center gap-0.5 pt-2 text-center ${rule}`}>
        <div className="font-bold">Thank you &amp; Merry Christmas!</div>
        {STORE.receiptNote && <div>{STORE.receiptNote}</div>}
        {STORE.email && <div>{STORE.email}</div>}
      </div>
    </div>
  );
};

export default Receipt;
