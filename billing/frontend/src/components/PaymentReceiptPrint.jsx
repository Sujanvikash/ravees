import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';

const when = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const Line = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-2 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const rule = 'border-t border-dashed border-black pt-1.5';

/** The 80mm receipt for a payment towards a credit bill's balance, black and white like the bill. Hidden on
 *  screen; it is the only thing that prints while it is on the page. The balances are as they were on the day. */
const PaymentReceiptPrint = ({ sale, collection }) => {
  const shop = locationById(sale.location) ?? {};
  const settings = useStore().settings;
  // Same header identity as the bill (components/Receipt.jsx).
  const storeName = settings.storeName?.trim() || shop.name;
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  const p = collection.payment;
  return (
    <div data-receipt className="hidden w-[72mm] font-mono text-[11px] leading-snug text-black print:block">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <img src={logo} alt={BRAND.name} className="print-ink mb-1 w-[20mm]" />
        {storeName && <div className="text-[18px] leading-tight font-bold tracking-wide uppercase">{storeName}</div>}
        {address.map((a) => (
          <div key={a}>{a}</div>
        ))}
        {phone && <div>Ph: {phone}</div>}
        {gstin && <div>GSTIN: {gstin}</div>}
      </div>

      <div className="my-2 border-y border-dashed border-black py-1 text-center font-bold tracking-[0.18em]">PAYMENT RECEIPT</div>

      <Line label="Receipt no" value={collection.receiptNo} />
      <Line label="Date" value={when.format(new Date(collection.at)).replace(',', '')} />
      <Line label="Against bill" value={sale.billNo} />
      <Line label="Bill date" value={when.format(new Date(sale.at)).replace(',', '').slice(0, 10)} />
      {sale.name && <Line label="Customer" value={sale.name} />}
      {sale.phone && <Line label="Mobile" value={formatMobile(sale.phone)} />}

      <div className={`mt-2 ${rule}`}>
        <Line label="Bill amount" value={amount(sale.totals.payable)} />
        {p.before !== undefined && <Line label="Balance before" value={amount(p.before)} />}
      </div>

      <Line label="AMOUNT RECEIVED" value={inr(collection.amount)} className="my-2 border-y border-black py-1 text-[13px] font-bold" />
      {p.split ? (
        <>
          {p.split.cash > 0 && <Line label="Paid · Cash" value={amount(p.split.cash)} />}
          {p.split.upi > 0 && <Line label="Paid · UPI" value={amount(p.split.upi)} />}
          {p.split.card > 0 && <Line label="Paid · Card" value={amount(p.split.card)} />}
        </>
      ) : (
        <Line label={`Paid · ${methodLabel(p.method)}`} value={amount(p.method === 'cash' ? p.received : collection.amount)} />
      )}
      {p.change > 0 && <Line label="Change" value={amount(p.change)} />}
      {p.approval && <Line label="Card approval" value={p.approval} />}

      {p.after !== undefined && (
        <Line
          label={p.after > 0 ? 'BALANCE DUE' : 'BILL PAID IN FULL'}
          value={p.after > 0 ? inr(p.after) : ''}
          className={`mt-2 text-[13px] font-bold ${rule}`}
        />
      )}

      <div className={`mt-4 ${rule}`}>Received by (staff) · {collection.by}</div>
      <div className="mt-2 text-center">Thank you</div>
    </div>
  );
};

export default PaymentReceiptPrint;
