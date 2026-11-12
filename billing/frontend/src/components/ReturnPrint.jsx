import { SELLER } from '../config.js';
import { findProduct } from '../lib/catalogue.js';
import { useDocTable } from '../lib/docLook.js';
import { sellerState, stateName } from '../lib/gst.js';
import { amount, inWords } from '../lib/money.js';
import { returnIssuer, returnSums } from '../lib/orders.js';
import { useStockDocColour } from '../lib/quoteColour.js';
import { DocFoot, DocFrame, DocHead, DocSums, Meta, Parties, PartyBox, SignOff } from './DocParts.jsx';

// 12-11-2026, as on the invoices
const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const date = (at) => day.format(new Date(at)).replaceAll('/', '-');

const REASON_LABEL = {
  'end-of-season': 'End of the season',
  'another-store': 'For another showroom',
  damaged: 'Damaged',
  other: 'Other',
};

/**
 * A purchase return as it comes out on A4: printed (ReturnPrint below) and in its preview and PDF (DocumentPreview).
 * Issued by the showroom (its business, as its Settings named it) to M/s Tree Classics Trader at the registered
 * office (SELLER in config.js, or the admin's Settings): each product it sends back at its D.Rate (the cost price the
 * admin billed it at), with no GST, and the transport (LR, vehicle, cartons) and e-way bill in its details. In the
 * admin's look and the colours picked on the preview (shared with purchase orders). `seller` is the settings in force
 * (the admin's, when the admin prints it).
 */
export const ReturnDocument = ({ doc, seller = {}, colour, look }) => {
  const from = returnIssuer(doc);
  const home = sellerState(seller);
  const { lines, value } = returnSums(doc);
  const toName = seller.bizName?.trim() || SELLER.name;
  const toGstin = seller.bizGstin?.trim() || SELLER.gstin;

  return (
    <DocFrame colour={colour} kind="purchaseReturn" look={look}>
      <DocHead
        title="PURCHASE RETURN"
        tag="Original"
        number={doc.number}
        date={date(doc.createdAt)}
        name={from.name}
        lines={from.lines}
        contact={from.phone && `Ph: ${from.phone}`}
        taxLine={[from.gstin && `GSTIN: ${from.gstin}`, from.state && `State: ${stateName(from.state)} (${from.state})`].filter(Boolean).join('  |  ')}
      />

      <Parties>
        <PartyBox label="Returned to">
          <div className="text-[12px] font-bold">M/s {toName}</div>
          <div>{SELLER.address}</div>
          <div className="mt-0.5 font-bold">
            GSTIN: {toGstin} | State: {stateName(home)} ({home})
          </div>
        </PartyBox>
        <PartyBox label="Return details" tinted>
          <Meta label="Return No." value={doc.number} />
          <Meta label="Date" value={date(doc.createdAt)} />
          <Meta label="Reason" value={REASON_LABEL[doc.reason] ?? doc.reason} />
          {doc.ewayNo && <Meta label="E-way bill" value={doc.ewayNo} />}
          {doc.lrNo && <Meta label="LR No." value={doc.lrNo} />}
          {doc.vehicleNo && <Meta label="Vehicle No." value={doc.vehicleNo} />}
          {doc.cartons != null && <Meta label="Cartons" value={doc.cartons} />}
        </PartyBox>
      </Parties>

      <ReturnTable lines={lines} />

      <DocSums
        words={inWords(value)}
        note={
          <>
            <div className="mt-2.5 text-black/70">Valued at D.Rate (the cost price). No GST.</div>
            {doc.note && (
              <div className="mt-1.5">
                <span className="font-semibold">Note: </span>
                {doc.note}
              </div>
            )}
          </>
        }
        rows={[
          ['Products', String(lines.length)],
          ['Quantity (Pcs)', String(lines.reduce((s, l) => s + l.qty, 0))],
        ]}
        grand={['TOTAL VALUE (₹)', amount(value)]}
      />

      <SignOff forName={from.name} />
      <DocFoot>
        {from.name}
        {from.gstin ? ` · GSTIN ${from.gstin}` : ''} · E&amp;OE
      </DocFoot>
    </DocFrame>
  );
};

/** The returned products and their Total row: a top-level table of the frame, so its rows are shared out over pages. */
const ReturnTable = ({ lines }) => {
  const t = useDocTable();
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={t.th}>S.No</th>
          <th className={t.th}>Code</th>
          <th className={`${t.th} text-left`}>Description</th>
          <th className={t.th}>HSN</th>
          <th className={t.th}>Qty (Pcs)</th>
          <th className={`${t.th} text-right`}>D. Rate (₹)</th>
          <th className={`${t.th} text-right`}>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.code} className={t.row}>
            <td className={`${t.td} text-center`}>{i + 1}</td>
            <td className={`${t.td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
            <td className={t.td}>{l.name}</td>
            <td className={`${t.td} text-center`}>{l.hsn || findProduct(l.code)?.hsn || ''}</td>
            <td className={`${t.td} text-center`}>{l.qty}</td>
            <td className={`${t.td} text-right`}>{amount(l.rate)}</td>
            <td className={`${t.td} text-right`}>{amount(l.amount)}</td>
          </tr>
        ))}
        <tr className={t.total}>
          <td colSpan={4} className={`${t.td} text-right`}>
            Total
          </td>
          <td className={`${t.td} text-center`}>{lines.reduce((s, l) => s + l.qty, 0)}</td>
          <td className={t.td} />
          <td className={`${t.td} text-right`}>{amount(lines.reduce((s, l) => s + l.amount, 0))}</td>
        </tr>
      </tbody>
    </table>
  );
};

/** A purchase return on an A4 page (the `quote` page in index.css), in the colours picked on its preview. Hidden on
 *  screen; it is the only thing that prints while it is on the page. */
const ReturnPrint = (props) => {
  const colour = useStockDocColour();
  return (
    <div className="hidden [page:quote] print:block">
      <ReturnDocument {...props} colour={colour} />
    </div>
  );
};

export default ReturnPrint;
