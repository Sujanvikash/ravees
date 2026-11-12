import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { useReceiptLook } from '../lib/docLook.js';
import { amount, inr } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';
import { Line, Slip, SlipBox, SlipHead, SlipSign, SlipStamp, SlipTitle, SlipTotal } from './ThermalParts.jsx';

const when = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

/** The 80mm receipt for a payment towards a credit bill's balance, black and white like the bill, in the look picked
 *  for payment receipts (Settings → Documents; `look` overrides it for a preview). Hidden on screen; it is the only
 *  thing that prints while it is on the page, and `screen` shows it instead. The balances are as they were on the day. */
const PaymentReceiptPrint = ({ sale, collection, look: chosen, screen = false }) => {
  const shop = locationById(sale.location) ?? {};
  const settings = useStore().settings;
  const look = useReceiptLook('paymentReceipt', chosen);
  // Same header identity as the bill (components/Receipt.jsx).
  const storeName = settings.storeName?.trim() || shop.name;
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  const p = collection.payment;
  return (
    <Slip look={look} screen={screen}>
      <SlipHead storeName={storeName} address={address} phone={phone} gstin={gstin} />

      <SlipTitle>PAYMENT RECEIPT</SlipTitle>
      <SlipBox ruled={false}>
        <Line label="Receipt no" value={collection.receiptNo} className="font-bold" />
        <Line label="Date" value={when.format(new Date(collection.at)).replace(',', '')} />
        <Line label="Against bill" value={sale.billNo} />
        <Line label="Bill date" value={when.format(new Date(sale.at)).replace(',', '').slice(0, 10)} />
        {sale.name && <Line label="Customer" value={sale.name} />}
        {sale.phone && <Line label="Mobile" value={formatMobile(sale.phone)} />}
      </SlipBox>

      <SlipBox>
        <Line label="Bill amount" value={amount(sale.totals.payable)} />
        {p.before !== undefined && <Line label="Balance before" value={amount(p.before)} />}
      </SlipBox>

      <SlipTotal label="AMOUNT RECEIVED" value={inr(collection.amount)} size="text-[13px]" />
      <SlipBox ruled={false}>
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
      </SlipBox>

      {p.after !== undefined &&
        (p.after > 0 ? (
          <SlipTotal label="BALANCE DUE" value={inr(p.after)} size="text-[13px]" />
        ) : (
          <SlipStamp>BILL PAID IN FULL</SlipStamp>
        ))}

      <SlipSign>Received by (staff) · {collection.by}</SlipSign>
      <div className="mt-2 text-center">Thank you</div>
    </Slip>
  );
};

export default PaymentReceiptPrint;
