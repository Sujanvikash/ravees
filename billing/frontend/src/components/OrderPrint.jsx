import logo from '../assets/logo.svg';
import { BRAND, SELLER, locationById } from '../config.js';
import { amount, inr } from '../lib/money.js';
import { orderGst, orderQty, orderTotal, orderValue, PO_GST, STATUS } from '../lib/orders.js';

const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const REASON_LABEL = {
  'end-of-season': 'End of the season',
  'another-store': 'For another showroom',
  damaged: 'Damaged',
  other: 'Other',
};

// Each document and the words that fit it: a purchase order goes admin → showroom; a return comes back the
// other way. Both carry the 18% GST on the purchase value (see lib/orders.js).
const DOC = {
  order: { title: 'PURCHASE ORDER', fromLabel: 'Supplier', toLabel: 'Deliver to', totalLabel: 'Order total' },
  return: { title: 'PURCHASE RETURN', fromLabel: 'Returned by', toLabel: 'Returned to', totalLabel: 'Return value' },
};

const Label = ({ children }) => <div className="mb-1 text-[9.5px] font-bold tracking-[0.16em] text-black uppercase">{children}</div>;
const Meta = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <span>{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);
const Sum = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-4 py-0.5 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const Party = ({ label, party }) => (
  <div>
    <Label>{label}</Label>
    <div className="text-[11.5px] font-bold">{party.name}</div>
    {party.lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
    {party.phone && <div>Ph: {party.phone}</div>}
    {party.gstin && <div>GSTIN: {party.gstin}</div>}
    {party.email && <div>{party.email}</div>}
  </div>
);

/**
 * A purchase order or a purchase return on an A4 page (the `quote` page in index.css), black and white only.
 * Hidden on screen; it is the only thing that prints while it is on the page. Both documents are internal, between
 * the admin's warehouse and a showroom, and both show the 18% GST the stock moves carry — so no watermark or
 * "not a bill" notice: these are real documents, unlike a quotation.
 */
const OrderPrint = ({ doc, kind = 'order' }) => {
  const meta = DOC[kind];
  const shop = locationById(doc.location) ?? {};
  // The admin's warehouse is Tree Classics Trader (the head office / supplier); the store is its own business.
  const warehouse = { name: SELLER.name, lines: [SELLER.address], phone: SELLER.phone, gstin: SELLER.gstin };
  const store = { name: shop.name || (shop.city ? `${shop.city} showroom · ${shop.area}` : BRAND.name), lines: shop.address ?? [], phone: shop.phone, gstin: shop.gstin };
  const from = kind === 'return' ? store : warehouse;
  const to = kind === 'return' ? warehouse : store;
  const received = doc.status === 'received';

  return (
    <div className="hidden text-[11.5px] leading-normal text-black [page:quote] print:block">
      <div className="relative">
        {/* header: the logo and brand on the left, the document and its number on the right */}
        <div className="flex items-start justify-between gap-8 border-b-2 border-black pb-4">
          <div className="flex items-start gap-4">
            <img src={logo} alt={BRAND.name} className="print-ink h-[64px] w-auto" />
            <div className="text-[10.5px] leading-snug">
              <div className="text-[11.5px] font-bold">{BRAND.name}</div>
              <div>{BRAND.tagline}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[26px] leading-none font-bold tracking-[0.12em]">{meta.title}</div>
            <div className="mt-2 font-mono text-[12px] font-semibold">{doc.number}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-10">
          <Party label={meta.fromLabel} party={from} />
          <Party label={meta.toLabel} party={to} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-10">
          <div>
            <Label>Details</Label>
            <Meta label="Date" value={dateTime.format(new Date(doc.createdAt))} />
            <Meta label="Status" value={STATUS[doc.status]?.label ?? doc.status} />
            {kind === 'return' && <Meta label="Reason" value={REASON_LABEL[doc.reason] ?? doc.reason} />}
          </div>
        </div>

        <table className="mt-6 w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-y-2 border-black text-left text-[9.5px] tracking-[0.14em] uppercase">
              <th className="py-1.5 pr-2 font-bold">#</th>
              <th className="py-1.5 pr-2 font-bold">Code</th>
              <th className="py-1.5 pr-2 font-bold">Item</th>
              <th className="py-1.5 pr-2 text-right font-bold">Qty</th>
              {received && <th className="py-1.5 pr-2 text-right font-bold">Counted</th>}
              <th className="py-1.5 pr-2 text-right font-bold">Rate</th>
              <th className="py-1.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => {
              const got = doc.counted?.find((c) => c.code === l.code)?.qty ?? 0;
              return (
                <tr key={l.code} className="border-b border-black/25 align-top">
                  <td className="py-1.5 pr-2">{i + 1}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10.5px]">{l.code}</td>
                  <td className="py-1.5 pr-2">{l.name}</td>
                  <td className="py-1.5 pr-2 text-right">{l.qty}</td>
                  {received && <td className={`py-1.5 pr-2 text-right ${got !== l.qty ? 'font-bold' : ''}`}>{got}</td>}
                  <td className="py-1.5 pr-2 text-right">{amount(l.rate)}</td>
                  <td className="py-1.5 text-right font-semibold">{amount(l.qty * l.rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-5 flex items-start justify-between gap-10 break-inside-avoid">
          <div className="max-w-[55%] text-[11px]">
            {doc.note && (
              <div className="mb-2">
                <span className="font-semibold">Note: </span>
                {doc.note}
              </div>
            )}
            <div>
              {doc.lines.length} {doc.lines.length === 1 ? 'product' : 'products'} · {orderQty(doc.lines)} qty.
              {received && ` ${orderQty(doc.counted ?? [])} counted in.`}
            </div>
          </div>
          <div className="w-64">
            <Sum label="Goods value" value={amount(orderValue(doc.lines))} />
            <Sum label={`GST ${PO_GST}%`} value={amount(orderGst(doc.lines))} />
            <Sum label={meta.totalLabel} value={inr(orderTotal(doc.lines))} className="mt-1.5 border-y-2 border-black py-1.5 text-[14px] font-bold" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-10 break-inside-avoid text-[10.5px]">
          <div className="border-t border-black pt-2">Prepared by (authorised signatory)</div>
          <div className="border-t border-black pt-2">Received by</div>
        </div>

        <div className="mt-6 flex items-end justify-between border-t border-black pt-2 text-[10.5px]">
          <span>
            {BRAND.name} · {BRAND.tagline}
          </span>
          {BRAND.email && <span>{BRAND.email}</span>}
        </div>
      </div>
    </div>
  );
};

export default OrderPrint;
