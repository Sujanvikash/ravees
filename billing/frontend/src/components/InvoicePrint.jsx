import { SELLER } from '../config.js';
import { findProduct } from '../lib/catalogue.js';
import { sellerState, stateName, stateOfGstin } from '../lib/gst.js';
import { amount, inWords } from '../lib/money.js';
import { useInvoiceColour } from '../lib/quoteColour.js';

// 10-11-2026, as on the business's own invoices
const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const date = (at) => day.format(new Date(at)).replaceAll('/', '-');
const paise = (n) => Math.round(n * 100) / 100;

const Label = ({ children }) => <div className="mb-1.5 text-[9.5px] font-bold tracking-[0.16em] text-(--q-accent) uppercase">{children}</div>;
const Meta = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-px">
    <span className="text-black/70">{label}</span>
    <span className="text-right font-semibold">{value}</span>
  </div>
);
const Sum = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-4 px-2.5 py-[3px] ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const th = 'border border-(--q-accent) px-1.5 py-1.5 text-[9px] font-bold tracking-[0.08em] uppercase';
const td = 'border border-(--q-line) px-1.5 py-[3px]';
const rule = { borderTop: '2px solid var(--q-accent)' }; // over the Total row

/**
 * An invoice as it comes out on A4: printed (InvoicePrint below) and in its preview and PDF (DocumentPreview). In the
 * colours picked on its preview (lib/quoteColour.js, Evergreen unless another is picked): the accent bands the top,
 * names the seller and heads the table and the grand total, alternate rows are tinted; black and white keeps it to
 * ink only. Laid out as the admin's business has its own tax invoices: the seller is Tree Classics Trader (SELLER in
 * config.js; Settings → Business details for invoices changes it), not Raave's, so no logo, at the address picked on
 * the invoice (Manali or Madhavaram; one raised before that has none and prints the Settings or built-in address). `seller` is those settings, `buyer` the showroom as the invoice names it ({ name, address, phone, gstin,
 * state }). The amounts are the invoice's, as the server worked them out: each product at its cost price (D.Rate), its
 * GST as CGST + SGST when the showroom is in the admin's state (Tamil Nadu) and IGST to any other, and the total
 * rounded to the rupee. (An invoice raised before that has no GST on its lines: it prints its amounts with GST 0.)
 * The e-way bill isn't on it: that is made after payment.
 * Each top-level part stays whole on a page; only the table's rows are shared out over pages (lib/docPages.js).
 */
export const InvoiceDocument = ({ invoice, seller, buyer, colour }) => {
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
  const mono = colour.mono;

  const sellerName = seller.bizName?.trim() || SELLER.name;
  const sellerLines = (invoice.sellerAddress?.trim() || seller.bizAddress?.trim() || SELLER.address).split('\n').filter(Boolean);
  const sellerGstin = seller.bizGstin?.trim() || SELLER.gstin;
  const home = sellerState(seller);
  const phone = seller.bizPhone?.trim() || SELLER.phone;
  const contact = [phone && `Ph: ${phone}`, seller.bizEmail, seller.bizPan && `PAN: ${seller.bizPan}`].filter(Boolean);
  const bank = [seller.bankName, seller.bankAccount && `A/c ${seller.bankAccount}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`].filter(Boolean);
  const terms = seller.invoiceTerms?.trim();

  return (
    <div
      style={{ '--q-accent': colour.accent, '--q-soft': colour.soft, '--q-line': colour.line }}
      className="relative text-[11px] leading-normal text-black [print-color-adjust:exact]"
    >
      {invoice.status === 'cancelled' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
          <span className="-rotate-12 border-4 border-black/30 px-6 py-2 text-[64px] font-bold tracking-[0.2em] text-black/20">CANCELLED</span>
        </div>
      )}

      <div>
        {/* the seller on the left, the document on the right, between two accent rules */}
        <div className={mono ? 'border-t-2 border-black' : 'h-1.5 rounded-t-sm bg-(--q-accent)'} />
        <div className="flex items-start justify-between gap-8 pt-4 pb-3.5">
          <div className="text-[10.5px] leading-snug">
            <div className="mb-1 text-[21px] leading-tight font-bold tracking-[0.02em] text-(--q-accent)">{sellerName}</div>
            {sellerLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            {contact.length > 0 && <div>{contact.join('  |  ')}</div>}
            <div className="mt-0.5 font-bold">
              GSTIN: {sellerGstin}  |  State: {seller.bizState?.trim() || stateName(home)} ({home})
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[25px] leading-none font-bold tracking-[0.1em] whitespace-nowrap text-(--q-accent)">TAX INVOICE</div>
            <div className="mt-2.5 inline-block rounded-md border border-(--q-line) bg-(--q-soft) px-2 py-0.5 font-mono text-[12px] font-semibold">
              {invoice.number}
            </div>
            <div className="mt-1 text-[10.5px]">Date: {date(invoice.createdAt)}</div>
          </div>
        </div>
        <div className="border-t-2 border-(--q-accent)" />

        <div className="mt-4 grid grid-cols-[1fr_17rem] gap-6">
          <div className="rounded-md border border-(--q-line) px-3 py-2.5">
            <Label>Bill to</Label>
            <div className="text-[12px] font-bold">{buyer.name}</div>
            {buyerLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            {buyer.phone && <div>Ph: {buyer.phone}</div>}
            <div className="mt-0.5 font-bold">GSTIN: {buyer.gstin || '____________'}</div>
          </div>
          <div className="rounded-md border border-(--q-line) bg-(--q-soft) px-3 py-2.5">
            <Label>Invoice details</Label>
            <Meta label="Invoice No." value={invoice.number} />
            <Meta label="Invoice Date" value={date(invoice.createdAt)} />
            <Meta label="Place of Supply" value={place ? `${stateName(place)} (${place})` : '—'} />
          </div>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-[10.5px] tabular-nums">
        <thead>
          <tr className={`text-center ${mono ? '' : 'bg-(--q-accent) text-white'}`}>
            <th className={th}>S.No</th>
            <th className={th}>Code</th>
            <th className={th}>Description</th>
            <th className={th}>HSN</th>
            {rate == null && <th className={th}>GST %</th>}
            <th className={th}>Qty (Pcs)</th>
            <th className={th}>D. Rate (₹)</th>
            <th className={th}>Taxable Amt (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.code} className="even:bg-(--q-soft)">
              <td className={`${td} text-center`}>{i + 1}</td>
              <td className={`${td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
              <td className={td}>{l.name}</td>
              <td className={`${td} text-center`}>{l.hsn}</td>
              {rate == null && <td className={`${td} text-center`}>{l.gst}%</td>}
              <td className={`${td} text-center`}>{l.qty}</td>
              <td className={`${td} text-right`}>{amount(l.rate)}</td>
              <td className={`${td} text-right`}>{amount(l.amount)}</td>
            </tr>
          ))}
          <tr className={`font-bold ${mono ? '' : 'bg-(--q-soft)'}`}>
            <td colSpan={rate == null ? 5 : 4} style={rule} className={`${td} text-right`}>
              Total
            </td>
            <td style={rule} className={`${td} text-center`}>{lines.reduce((s, l) => s + l.qty, 0)}</td>
            <td style={rule} className={td} />
            <td style={rule} className={`${td} text-right`}>{amount(taxable)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex items-start justify-between gap-8 break-inside-avoid">
        <div className="max-w-[55%] text-[10.5px]">
          <div className="border-l-4 border-(--q-accent) bg-(--q-soft) px-3 py-2">
            <Label>Amount in words</Label>
            <div className="font-bold">{inWords(grand)}</div>
          </div>
          {invoice.note && (
            <div className="mt-2.5">
              <span className="font-semibold">Note: </span>
              {invoice.note}
            </div>
          )}
        </div>
        <div className="w-[17rem] overflow-hidden rounded-md border border-(--q-line) text-[10.5px] tabular-nums [&>*+*]:border-t [&>*+*]:border-(--q-line)">
          <Sum label="Taxable Value" value={amount(taxable)} />
          {same ? (
            <>
              <Sum label={`CGST${at(rate / 2)}`} value={amount(half)} />
              <Sum label={`SGST${at(rate / 2)}`} value={amount(tax - half)} />
            </>
          ) : (
            <Sum label={`IGST${at(rate)}`} value={amount(tax)} />
          )}
          <Sum label="Round Off" value={amount(roundOff)} />
          <Sum
            label="GRAND TOTAL (₹)"
            value={amount(grand)}
            className={`py-1.5 text-[13px] font-bold ${mono ? 'border-t-2! border-black!' : 'bg-(--q-accent) text-white'}`}
          />
        </div>
      </div>

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

      <div className="mt-8 grid grid-cols-2 items-end gap-16 break-inside-avoid text-[10.5px]">
        <div className="border-t border-black/50 pt-1">Receiver&rsquo;s Signature</div>
        <div className="text-right">
          <div className="font-bold text-(--q-accent)">For {sellerName}</div>
          <div className="mt-14 border-t border-black/50 pt-1">Authorised Signatory</div>
        </div>
      </div>

      <div className="mt-6 border-t border-(--q-accent) pt-1.5 text-center text-[9px] tracking-[0.06em] text-black/60">
        {sellerName} · GSTIN {sellerGstin}
      </div>
    </div>
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
