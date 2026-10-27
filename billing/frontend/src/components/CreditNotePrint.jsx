import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';

const when = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const Line = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const rule = 'border-t border-dashed border-black pt-1.5';

/** The 80mm credit note for goods brought back (a return or the return half of an exchange), black and white
 *  like the bill. Hidden on screen; it is the only thing that prints while it is on the page. */
const CreditNotePrint = ({ note }) => {
  const shop = locationById(note.location) ?? {};
  return (
    <div className="hidden font-mono text-[11px] leading-snug text-black print:block">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <img src={logo} alt={BRAND.name} className="print-ink mb-1.5 w-[46mm]" />
        {(shop.address ?? []).map((a) => (
          <div key={a}>{a}</div>
        ))}
        {shop.gstin && <div>GSTIN: {shop.gstin}</div>}
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">CREDIT NOTE</div>

      <Line label="Credit note" value={note.returnNo} />
      <Line label="Date" value={when.format(new Date(note.at)).replace(',', '')} />
      <Line label="Against bill" value={note.billNo} />
      {note.name && <Line label="Customer" value={note.name} />}
      {note.phone && <Line label="Mobile" value={formatMobile(note.phone)} />}

      <Line label="ITEM RETURNED / QTY × RATE" value="AMOUNT" className={`mt-2 font-bold ${rule}`} />
      <div className="mt-1 flex flex-col gap-1.5">
        {note.lines.map((l, i) => (
          <div key={l.code}>
            <div className="font-semibold">
              {i + 1}. {l.name}
            </div>
            <Line label={`${l.code}  ${l.qty} × ${amount(l.price)}`} value={amount(l.price * l.qty)} />
          </div>
        ))}
      </div>

      <Line label="RETURNED VALUE" value={inr(note.amount)} className="my-2 border-y border-black py-1 text-[13px] font-bold" />
      {note.kind === 'exchange' && <Line label={`Used on bill ${note.exchangeBillNo}`} value={amount(note.amount - note.refund)} />}
      <Line label="Refunded in cash" value={inr(note.refund)} className="font-bold" />
      {note.reason && <div className="mt-1">Reason: {note.reason}</div>}

      <div className={`mt-4 ${rule}`}>Customer signature</div>
      <div className="mt-6 border-t border-black pt-1">Received by (staff)</div>
    </div>
  );
};

export default CreditNotePrint;
