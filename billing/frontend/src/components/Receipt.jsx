import logo from '../assets/logo.svg';
import { BILL_FOOTER, BRAND, locationById } from '../config.js';
import { countLabel, gstLines } from '../lib/bill.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
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

// A Christmas wish at the foot of every bill.
const WISHES = [
  'May your tree shine bright and your home be full of joy this Christmas.',
  'Wishing you warm lights, sweet carols and a season of peace.',
  'May every ornament you hang carry a happy memory. Merry Christmas!',
  'Here’s to twinkling lights, full tables and the people you love.',
  'May the magic of Christmas fill your home and stay all year.',
  'Thank you for making us part of your celebrations. Joy to your world!',
  'Wishing you a sparkling Christmas and a bright New Year.',
  'May your days be merry, your evenings glow, and your tree stand tall.',
];

/** The same bill always gets the same wish, so a reprint matches the first copy. */
const wishFor = (billNo = '') => WISHES[[...billNo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % WISHES.length];

/** The 80mm thermal tax invoice, headed by the logo. Hidden on screen; it is the only thing that prints, in black
 *  and white only. */
const Receipt = ({ sale }) => {
  const { totals, payment } = sale;
  const { settings } = useStore();
  const shop = locationById(sale.location) ?? {};
  // A composition dealer bills a "Bill of Supply": no GST is shown (the price already includes it). The store
  // fills in its own name, address, phone, GSTIN and footer (Settings → Shop on the bill), falling back to the
  // built-in showroom details when a field is left blank.
  const composition = Boolean(settings.composition);
  const gst = settings.showGst && !composition;
  const storeName = settings.storeName?.trim();
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  const title = composition ? 'BILL OF SUPPLY' : gst ? 'TAX INVOICE' : 'INVOICE';
  return (
    <div data-receipt className="hidden w-[72mm] font-mono text-[11px] leading-snug text-black print:block">
      <div className="flex flex-col items-center gap-0.5 text-center">
        {/* the Raave's logo is a small mark on top; the showroom's own name is the large line below it */}
        <img src={logo} alt={BRAND.name} className="print-ink mb-1 w-[20mm]" />
        {storeName && <div className="text-[18px] leading-tight font-bold tracking-wide uppercase">{storeName}</div>}
        {address.map((a) => (
          <div key={a}>{a}</div>
        ))}
        {phone && <div>Ph: {phone}</div>}
        {gstin && <div>GSTIN: {gstin}</div>}
        {composition && <div className="font-bold">Composition Dealer</div>}
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">{title}</div>
      <div className="mb-1.5 text-center text-[12px] font-bold">Bill No. {sale.billNo}</div>

      <Line label="Date" value={when.format(new Date(sale.at)).replace(',', '')} />
      <Line label="Showroom" value={shop.city} />
      {sale.name && <Line label="Customer" value={sale.name} />}
      {sale.phone && <Line label="Mobile" value={formatMobile(sale.phone)} />}

      {/* each item on its own line with its code and quantity, then a column row: MRP · discount · price · amount */}
      <div className={`mt-2 grid grid-cols-4 gap-x-2 pt-1 text-[9.5px] font-bold ${rule}`}>
        <span className="text-right">MRP</span>
        <span className="text-right">DISC</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">AMOUNT</span>
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {sale.lines.map((l, i) => {
          // the catalogue's own offer discount, MRP → selling price
          const disc = l.mrp > l.price ? ((l.mrp - l.price) / l.mrp) * 100 : 0;
          return (
            <div key={l.code}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {i + 1}. {l.name}
                </span>
                <span className="shrink-0 text-[10px]">
                  {l.code} ×{l.qty}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-x-2 tabular-nums">
                <span className="text-right">{amount(l.mrp)}</span>
                <span className="text-right">{disc > 0 ? `${Math.round(disc)}%` : '—'}</span>
                <span className="text-right">{amount(l.price)}</span>
                <span className="text-right font-semibold">{amount(l.price * l.qty)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-2 ${rule}`}>
        <div>{countLabel(totals)}</div>
        <Line label="MRP total" value={amount(totals.mrpTotal)} />
        {totals.savings > 0 && <Line label="You saved" value={amount(totals.savings)} />}
        {totals.discount > 0 && (
          <Line label={`Discount${totals.discountKind === 'percent' ? ` (${totals.discountValue}%)` : ''}`} value={amount(-totals.discount)} />
        )}
        {Math.abs(totals.roundOff) >= 0.005 && <Line label="Round off" value={amount(totals.roundOff)} />}
      </div>

      <Line label="TOTAL" value={inr(totals.payable)} className="my-2 border-y border-black py-1 text-[15px] font-bold" />

      {gst && (
        <>
          <div className="font-bold">GST SUMMARY (incl. in price)</div>
          <Line label="Taxable value" value={amount(totals.taxable)} />
          {gstLines(totals.gstRows).map((g) => (
            <Line key={g.label} label={g.label} value={amount(g.value)} />
          ))}
        </>
      )}

      <div className={`mt-2 ${rule}`}>
        {payment.credit > 0 && (
          <Line label={`Exchange credit ${payment.creditNote ?? ''}`.trim()} value={amount(-payment.credit)} className="font-bold" />
        )}
        {payment.method === 'credit' || payment.method === 'later' ? null : payment.split ? (
          <>
            {payment.split.cash > 0 && <Line label="Paid · Cash" value={amount(payment.split.cash)} />}
            {payment.split.upi > 0 && <Line label="Paid · UPI" value={amount(payment.split.upi)} />}
            {payment.split.card > 0 && <Line label="Paid · Card" value={amount(payment.split.card)} />}
          </>
        ) : (
          <Line label={`Paid · ${methodLabel(payment.method)}`} value={amount(payment.received)} />
        )}
        {payment.change > 0 && <Line label="Change" value={amount(payment.change)} className="font-bold" />}
        {payment.approval && <Line label="Card approval" value={payment.approval} />}
        {payment.later > 0 && (
          <>
            {payment.method === 'later' && <Line label="Paid now" value={amount(0)} />}
            <Line label="BALANCE DUE" value={inr(payment.later)} className="mt-1 border-y border-black py-1 text-[13px] font-bold" />
            <div className="text-[10px]">Credit bill: please pay the balance at the showroom quoting this bill number.</div>
          </>
        )}
      </div>

      {/* the fixed policy note, the same on every showroom's bill */}
      <div className={`mt-2 flex flex-col items-center gap-0.5 pt-2 text-center ${rule}`}>
        {BILL_FOOTER.map((f) => (
          <div key={f} className="font-bold">
            {f}
          </div>
        ))}
        {BRAND.email && <div>{BRAND.email}</div>}
      </div>

      {/* a Christmas wish on every bill */}
      <div className="mt-2 border-y border-black py-1.5 text-center">
        <div className="tracking-[0.3em]" aria-hidden="true">
          * * * * *
        </div>
        <div className="mt-1 font-display text-[12px] italic">{wishFor(sale.billNo)}</div>
      </div>
    </div>
  );
};

export default Receipt;
