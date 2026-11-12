import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { useReceiptLook } from '../lib/docLook.js';
import { amount, inr } from '../lib/money.js';
import { shortName } from '../lib/shortName.js';
import { Line, Slip, SlipBox, SlipColumns, SlipHead, SlipItems, SlipSign, SlipTitle, SlipTotal } from './ThermalParts.jsx';

const when = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

/** The 80mm credit note for goods brought back (a return or the return half of an exchange), black and white
 *  like the bill, in the look picked for credit notes (Settings → Documents; `look` overrides it for a preview).
 *  Hidden on screen; it is the only thing that prints while it is on the page. `screen` shows it instead. */
const CreditNotePrint = ({ note, look: chosen, screen = false }) => {
  const shop = locationById(note.location) ?? {};
  const settings = useStore().settings;
  const look = useReceiptLook('creditNote', chosen);
  const composition = Boolean(settings.composition);
  // Same header identity as the bill (components/Receipt.jsx): the Raave's logo on top, the showroom's own name larger below.
  const storeName = settings.storeName?.trim() || shop.name;
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  return (
    <Slip look={look} screen={screen}>
      <SlipHead storeName={storeName} address={address} phone={phone} gstin={gstin} composition={composition} />

      <SlipTitle>CREDIT NOTE</SlipTitle>
      <SlipBox ruled={false}>
        <Line label="Credit note" value={note.returnNo} className="font-bold" />
        <Line label="Date" value={when.format(new Date(note.at)).replace(',', '')} />
        <Line label="Against bill" value={note.billNo} />
        {note.name && <Line label="Customer" value={note.name} />}
        {note.phone && <Line label="Mobile" value={formatMobile(note.phone)} />}
      </SlipBox>

      <SlipColumns className="flex justify-between gap-2">
        <span>ITEM RETURNED / QTY × RATE</span>
        <span>AMOUNT</span>
      </SlipColumns>
      <SlipItems>
        {note.lines.map((l, i) => (
          <div key={l.code}>
            <div className="truncate font-semibold">
              {i + 1}. {shortName(l.name)}
            </div>
            <Line label={`${l.code}  ${l.qty} × ${amount(l.price)}`} value={amount(l.price * l.qty)} />
          </div>
        ))}
      </SlipItems>

      <SlipTotal label="RETURNED VALUE" value={inr(note.amount)} size="text-[13px]" />
      <SlipBox ruled={false}>
        {note.kind === 'exchange' && <Line label={`Used on bill ${note.exchangeBillNo}`} value={amount(note.amount - note.refund)} />}
        <Line label="Refunded in cash" value={inr(note.refund)} className="font-bold" />
        {note.reason && <div className="mt-1">Reason: {note.reason}</div>}
      </SlipBox>

      <SlipSign>Customer signature</SlipSign>
      <SlipSign className="mt-6">Received by (staff)</SlipSign>
    </Slip>
  );
};

export default CreditNotePrint;
