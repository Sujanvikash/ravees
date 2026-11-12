import { SELLER } from '../config.js';
import { findProduct } from '../lib/catalogue.js';
import { sellerState, stateName, stateOfGstin } from '../lib/gst.js';
import { amount, inWords } from '../lib/money.js';
import { useInvoiceColour } from '../lib/quoteColour.js';
import { useDocTable } from '../lib/docLook.js';
import { DocFoot, DocFrame, DocHead, DocSums, Label, Meta, Parties, PartyBox, SignOff } from './DocParts.jsx';

// 10-11-2026, as on the business's own invoices
const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const date = (at) => day.format(new Date(at)).replaceAll('/', '-');
const paise = (n) => Math.round(n * 100) / 100;

/**
 * An invoice as it comes out on A4: printed (InvoicePrint below) and in its preview and PDF (DocumentPreview). In the
 * look the admin picked (Settings → Documents; `look` overrides it for a preview there) and the colours picked on its
 * preview (lib/quoteColour.js, Evergreen unless another is picked), made of the shared parts in DocParts.jsx; TAX
 * INVOICE heads the page in every look. Laid out like the purchase return: the e-way bill and bill numbers in its
 * details once recorded, an HSN summary of the tax under the totals, and E&OE at the foot. Laid out as the admin's business has its own tax invoices: the seller is Tree Classics Trader (SELLER in
 * config.js; Settings → Business details for invoices changes it), not Raave's, so no logo, at the address picked on
 * the invoice (Manali or Madhavaram; one raised before that has none and prints the Settings or built-in address). `seller` is those settings, `buyer` the showroom as the invoice names it ({ name, address, phone, gstin,
 * state }). The amounts are the invoice's, as the server worked them out: each product at its cost price (D.Rate), its
 * GST as CGST + SGST when the showroom is in the admin's state (Tamil Nadu) and IGST to any other, and the total
 * rounded to the rupee. (An invoice raised before that has no GST on its lines: it prints its amounts with GST 0.)
 * The e-way bill isn't on it: that is made after payment.
 * Each top-level part stays whole on a page; only the table's rows are shared out over pages (lib/docPages.js).
 */
export const InvoiceDocument = ({ invoice, seller, buyer, colour, look }) => {
  const lines = invoice.lines.map((l) => ({ ...l, hsn: l.hsn || findProduct(l.code)?.hsn || '', gst: l.gst ?? 0, tax: l.tax ?? 0 }));
  const place = buyer.state || stateOfGstin(buyer.gstin);
  const same = invoice.interState != null ? !invoice.interState : place === sellerState(seller);
  const buyerLines = (buyer.address ?? '').split('\n').filter(Boolean);
  const taxable = lines.reduce((s, l) => s + l.amount, 0);
  const tax = paise(lines.reduce((s, l) => s + l.tax, 0));
  const half = paise(tax / 2);
  const grand = invoice.total;
  const roundOff = paise(grand - taxable - tax);
  // one GST rate for every line (the usual 18%) goes on the tax lines; mixed rates get a column of their own
  const rates = [...new Set(lines.map((l) => l.gst))];
  const rate = rates.length === 1 ? rates[0] : null;
  const at = (r) => (rate == null ? '' : ` @ ${r}%`);

  const sellerName = seller.bizName?.trim() || SELLER.name;
  const sellerLines = (invoice.sellerAddress?.trim() || seller.bizAddress?.trim() || SELLER.address).split('\n').filter(Boolean);
  const sellerGstin = seller.bizGstin?.trim() || SELLER.gstin;
  const home = sellerState(seller);
  const phone = seller.bizPhone?.trim() || SELLER.phone;
  const contact = [phone && `Ph: ${phone}`, seller.bizEmail, seller.bizPan && `PAN: ${seller.bizPan}`].filter(Boolean);
  const bank = [seller.bankName, seller.bankAccount && `A/c ${seller.bankAccount}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`].filter(Boolean);
  const terms = seller.invoiceTerms?.trim();

  return (
    <DocFrame colour={colour} kind="invoice" look={look} stamp={invoice.status === 'cancelled' ? 'CANCELLED' : null}>
      <DocHead
        title="TAX INVOICE"
        tag="Original for recipient"
        number={invoice.number}
        date={date(invoice.createdAt)}
        name={sellerName}
        lines={sellerLines}
        contact={contact.join('  |  ')}
        taxLine={`GSTIN: ${sellerGstin}  |  State: ${seller.bizState?.trim() || stateName(home)} (${home})`}
      />

      <Parties>
        <PartyBox label="Bill to">
          <div className="text-[12px] font-bold">{buyer.name}</div>
          {buyerLines.map((l) => (
            <div key={l}>{l}</div>
          ))}
          {buyer.phone && <div>Ph: {buyer.phone}</div>}
          <div className="mt-0.5 font-bold">GSTIN: {buyer.gstin || '____________'}</div>
        </PartyBox>
        <PartyBox label="Invoice details" tinted>
          <Meta label="Invoice No." value={invoice.number} />
          <Meta label="Invoice Date" value={date(invoice.createdAt)} />
          <Meta label="Place of Supply" value={place ? `${stateName(place)} (${place})` : '—'} />
          {invoice.ewayNo && <Meta label="E-way bill" value={invoice.ewayNo} />}
          {invoice.billNo && <Meta label="Bill No." value={invoice.billNo} />}
        </PartyBox>
      </Parties>

      <InvoiceTable lines={lines} rate={rate} />

      <DocSums
        words={inWords(grand)}
        note={
          invoice.note && (
            <div className="mt-2.5">
              <span className="font-semibold">Note: </span>
              {invoice.note}
            </div>
          )
        }
        rows={[
          ['Taxable Value', amount(taxable)],
          ...(same
            ? [
                [`CGST${at(rate / 2)}`, amount(half)],
                [`SGST${at(rate / 2)}`, amount(tax - half)],
              ]
            : [[`IGST${at(rate)}`, amount(tax)]]),
          ['Round Off', amount(roundOff)],
        ]}
        grand={['GRAND TOTAL (₹)', amount(grand)]}
      />

      <HsnTable lines={lines} same={same} />

      {(bank.length > 0 || terms) && (
        <div className="mt-5 grid grid-cols-2 gap-10 break-inside-avoid text-[10.5px]">
          {bank.length > 0 && (
            <div>
              <Label>Bank details</Label>
              {bank.map((b) => (
                <div key={b}>{b}</div>
              ))}
            </div>
          )}
          {terms && (
            <div>
              <Label>Terms</Label>
              <div className="whitespace-pre-line">{terms}</div>
            </div>
          )}
        </div>
      )}

      <SignOff forName={sellerName} />
      <DocFoot>
        {sellerName} · GSTIN {sellerGstin} · E&amp;OE
      </DocFoot>
    </DocFrame>
  );
};

/** The invoice's lines and their Total row: a top-level <table> of the frame (so its rows are shared out over the
 *  pages), in the frame's look. */
const InvoiceTable = ({ lines, rate }) => {
  const t = useDocTable();
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={t.th}>S.No</th>
          <th className={t.th}>Code</th>
          <th className={`${t.th} text-left`}>Description</th>
          <th className={t.th}>HSN</th>
          {rate == null && <th className={t.th}>GST %</th>}
          <th className={t.th}>Qty (Pcs)</th>
          <th className={`${t.th} text-right`}>D. Rate (₹)</th>
          <th className={`${t.th} text-right`}>Taxable Amt (₹)</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.code} className={t.row}>
            <td className={`${t.td} text-center`}>{i + 1}</td>
            <td className={`${t.td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
            <td className={t.td}>{l.name}</td>
            <td className={`${t.td} text-center`}>{l.hsn}</td>
            {rate == null && <td className={`${t.td} text-center`}>{l.gst}%</td>}
            <td className={`${t.td} text-center`}>{l.qty}</td>
            <td className={`${t.td} text-right`}>{amount(l.rate)}</td>
            <td className={`${t.td} text-right`}>{amount(l.amount)}</td>
          </tr>
        ))}
        <tr className={t.total}>
          <td colSpan={rate == null ? 5 : 4} className={`${t.td} text-right`}>
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

/** The tax by HSN code and rate, as the GST return needs it: the taxable value and CGST + SGST inside the state,
 *  or IGST across states. A top-level table of the frame, in its look. */
const HsnTable = ({ lines, same }) => {
  const t = useDocTable();
  const groups = new Map();
  for (const l of lines) {
    const key = `${l.hsn || '—'}|${l.gst}`;
    const g = groups.get(key) ?? { hsn: l.hsn || '—', gst: l.gst, taxable: 0, tax: 0 };
    g.taxable += l.amount;
    g.tax += l.tax;
    groups.set(key, g);
  }
  const rows = [...groups.values()];
  const half = (g) => paise(g.tax / 2);
  const total = (pick) => rows.reduce((sum, g) => sum + pick(g), 0);
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={`${t.th} text-left`}>HSN / SAC</th>
          <th className={`${t.th} text-right`}>Taxable Value (₹)</th>
          {same ? (
            <>
              <th className={t.th}>CGST %</th>
              <th className={`${t.th} text-right`}>CGST (₹)</th>
              <th className={t.th}>SGST %</th>
              <th className={`${t.th} text-right`}>SGST (₹)</th>
            </>
          ) : (
            <>
              <th className={t.th}>IGST %</th>
              <th className={`${t.th} text-right`}>IGST (₹)</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={`${g.hsn}|${g.gst}`} className={t.row}>
            <td className={t.td}>{g.hsn}</td>
            <td className={`${t.td} text-right`}>{amount(g.taxable)}</td>
            {same ? (
              <>
                <td className={`${t.td} text-center`}>{g.gst / 2}</td>
                <td className={`${t.td} text-right`}>{amount(half(g))}</td>
                <td className={`${t.td} text-center`}>{g.gst / 2}</td>
                <td className={`${t.td} text-right`}>{amount(g.tax - half(g))}</td>
              </>
            ) : (
              <>
                <td className={`${t.td} text-center`}>{g.gst}</td>
                <td className={`${t.td} text-right`}>{amount(g.tax)}</td>
              </>
            )}
          </tr>
        ))}
        <tr className={t.total}>
          <td className={`${t.td} text-right`}>Total</td>
          <td className={`${t.td} text-right`}>{amount(total((g) => g.taxable))}</td>
          {same ? (
            <>
              <td className={t.td} />
              <td className={`${t.td} text-right`}>{amount(total(half))}</td>
              <td className={t.td} />
              <td className={`${t.td} text-right`}>{amount(total((g) => g.tax - half(g)))}</td>
            </>
          ) : (
            <>
              <td className={t.td} />
              <td className={`${t.td} text-right`}>{amount(total((g) => g.tax))}</td>
            </>
          )}
        </tr>
      </tbody>
    </table>
  );
};

/** An invoice on an A4 page (the `quote` page in index.css), in the colours picked on its preview. Hidden on screen;
 *  it is the only thing that prints while it is on the page. */
const InvoicePrint = (props) => {
  const colour = useInvoiceColour();
  return (
    <div className="hidden [page:quote] print:block">
      <InvoiceDocument {...props} colour={colour} />
    </div>
  );
};

export default InvoicePrint;
