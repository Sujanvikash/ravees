import { SELLER, locationById } from '../config.js';
import { useDocTable } from '../lib/docLook.js';
import { amount, inWords } from '../lib/money.js';
import { orderGst, orderQty, orderTotal, orderValue, PO_GST, STATUS } from '../lib/orders.js';
import { useStockDocColour } from '../lib/quoteColour.js';
import { DocFoot, DocFrame, DocHead, DocSums, Meta, Parties, PartyBox, SignOff } from './DocParts.jsx';

// 12-11-2026, as on the invoices
const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const date = (at) => day.format(new Date(at)).replaceAll('/', '-');

/** The ordered products and their Total row: a top-level table of the frame, so its rows are shared out over pages.
 *  An older order counted in at the showroom shows what was counted too. */
const OrderTable = ({ doc }) => {
  const t = useDocTable();
  const received = doc.status === 'received';
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={t.th}>S.No</th>
          <th className={t.th}>Code</th>
          <th className={`${t.th} text-left`}>Item</th>
          <th className={t.th}>Qty</th>
          {received && <th className={t.th}>Counted</th>}
          <th className={`${t.th} text-right`}>Rate (₹)</th>
          <th className={`${t.th} text-right`}>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {doc.lines.map((l, i) => {
          const got = doc.counted?.find((c) => c.code === l.code)?.qty ?? 0;
          return (
            <tr key={l.code} className={t.row}>
              <td className={`${t.td} text-center`}>{i + 1}</td>
              <td className={`${t.td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
              <td className={t.td}>{l.name}</td>
              <td className={`${t.td} text-center`}>{l.qty}</td>
              {received && <td className={`${t.td} text-center ${got !== l.qty ? 'font-bold' : ''}`}>{got}</td>}
              <td className={`${t.td} text-right`}>{amount(l.rate)}</td>
              <td className={`${t.td} text-right`}>{amount(l.qty * l.rate)}</td>
            </tr>
          );
        })}
        <tr className={t.total}>
          <td colSpan={3} className={`${t.td} text-right`}>
            Total
          </td>
          <td className={`${t.td} text-center`}>{orderQty(doc.lines)}</td>
          {received && <td className={`${t.td} text-center`}>{orderQty(doc.counted ?? [])}</td>}
          <td className={t.td} />
          <td className={`${t.td} text-right`}>{amount(orderValue(doc.lines))}</td>
        </tr>
      </tbody>
    </table>
  );
};

/**
 * A purchase order on an A4 page (the `quote` page in index.css): the showroom asks the admin's business (Tree
 * Classics Trader, SELLER in config.js) for stock, at the purchase rate with the 18% GST the stock moves carry (see
 * lib/orders.js). Issued by the showroom, in the admin's look (Settings → Documents) and the colours picked on a
 * purchase return's preview (the two share them); `look` overrides the admin's for a Settings preview. OrderPrint
 * below prints it. (Purchase returns print as their own document: ReturnPrint.jsx.)
 */
export const OrderDocument = ({ doc, colour, look }) => {
  const shop = locationById(doc.location) ?? {};
  const name = shop.name || (shop.label ? `${shop.label} showroom` : '');

  return (
    <DocFrame colour={colour} kind="purchaseOrder" look={look}>
      <DocHead
        title="PURCHASE ORDER"
        number={doc.number}
        date={date(doc.createdAt)}
        name={name}
        lines={shop.address ?? []}
        contact={shop.phone && `Ph: ${shop.phone}`}
        taxLine={shop.gstin && `GSTIN: ${shop.gstin}`}
      />

      <Parties>
        <PartyBox label="Supplier">
          <div className="text-[12px] font-bold">M/s {SELLER.name}</div>
          <div>{SELLER.address}</div>
          {SELLER.phone && <div>Ph: {SELLER.phone}</div>}
          <div className="mt-0.5 font-bold">GSTIN: {SELLER.gstin}</div>
        </PartyBox>
        <PartyBox label="Order details" tinted>
          <Meta label="Order No." value={doc.number} />
          <Meta label="Date" value={date(doc.createdAt)} />
          <Meta label="Status" value={STATUS[doc.status]?.label ?? doc.status} />
          <Meta label="Deliver to" value={shop.label ?? doc.location} />
        </PartyBox>
      </Parties>

      <OrderTable doc={doc} />

      <DocSums
        words={inWords(orderTotal(doc.lines))}
        note={
          doc.note && (
            <div className="mt-2.5">
              <span className="font-semibold">Note: </span>
              {doc.note}
            </div>
          )
        }
        rows={[
          ['Goods value', amount(orderValue(doc.lines))],
          [`GST ${PO_GST}%`, amount(orderGst(doc.lines))],
        ]}
        grand={['ORDER TOTAL (₹)', amount(orderTotal(doc.lines))]}
      />

      <SignOff forName={name} left="Supplier’s acknowledgement" />
      <DocFoot>
        {name}
        {shop.gstin ? ` · GSTIN ${shop.gstin}` : ''}
      </DocFoot>
    </DocFrame>
  );
};

/** A purchase order on an A4 page, in the colours picked on a purchase return's preview. Hidden on screen. */
const OrderPrint = ({ doc }) => {
  const colour = useStockDocColour();
  return (
    <div className="hidden [page:quote] print:block">
      <OrderDocument doc={doc} colour={colour} />
    </div>
  );
};

export default OrderPrint;
