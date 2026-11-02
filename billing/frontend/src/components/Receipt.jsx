import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
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
  const footer = settings.billFooter?.trim() ? settings.billFooter.split('\n').filter(Boolean) : [];
  const title = composition ? 'BILL OF SUPPLY' : gst ? 'TAX INVOICE' : 'INVOICE';
  return (
    <div data-receipt className="hidden w-[72mm] font-mono text-[11px] leading-snug text-black print:block">
      <div className="flex flex-col items-center gap-0.5 text-center">
        {/* the logo carries the name, "Christmas Tree & Decoration" and "Since 1997" */}
        <img src={logo} alt={BRAND.name} className="print-ink mb-1.5 w-[46mm]" />
        {storeName && <div className="text-[13px] font-bold tracking-wide">{storeName}</div>}
        {address.map((a) => (
          <div key={a}>{a}</div>
        ))}
        {phone && <div>Ph: {phone}</div>}
        {gstin && <div>GSTIN: {gstin}</div>}
        {composition && <div className="font-bold">Composition Dealer</div>}
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">{title}</div>

      <Line label="Bill" value={sale.billNo} />
      <Line label="Date" value={when.format(new Date(sale.at)).replace(',', '')} />
      <Line label="Showroom" value={shop.city} />
      {sale.name && <Line label="Customer" value={sale.name} />}
      {sale.phone && <Line label="Mobile" value={formatMobile(sale.phone)} />}

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
        {totals.discount > 0 && (
          <Line label={`Discount${totals.discountKind === 'percent' ? ` (${totals.discountValue}%)` : ''}`} value={amount(-totals.discount)} />
        )}
        {Math.abs(totals.roundOff) >= 0.005 && <Line label="Round off" value={amount(totals.roundOff)} />}
      </div>

      <Line label="TOTAL" value={inr(totals.payable)} className="my-2 border-y border-black py-1 text-[15px] font-bold" />
      {composition && <div className="-mt-1 mb-1 text-center text-[10px]">E. &amp; O.E. · Price incl. GST (not charged separately)</div>}

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
        {payment.method === 'credit' ? null : payment.split ? (
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
        {footer.length > 0 ? (
          footer.map((f) => (
            <div key={f} className="font-bold">
              {f}
            </div>
          ))
        ) : (
          <div className="font-bold">Thank you &amp; Merry Christmas!</div>
        )}
        {BRAND.receiptNote && <div>{BRAND.receiptNote}</div>}
        {BRAND.email && <div>{BRAND.email}</div>}
      </div>

      {!composition && (
        <div className="mt-2 border-y border-black py-1.5 text-center">
          <div className="tracking-[0.3em]" aria-hidden="true">
            * * * * *
          </div>
          <div className="mt-1 font-display text-[12px] italic">{wishFor(sale.billNo)}</div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.2em]">SEASON&rsquo;S GREETINGS</div>
        </div>
      )}
    </div>
  );
};

export default Receipt;
