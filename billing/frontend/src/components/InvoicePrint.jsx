import { SELLER } from '../config.js';
import { findProduct } from '../lib/catalogue.js';
import { sellerState, stateName, stateOfGstin } from '../lib/gst.js';
import { amount, inWords } from '../lib/money.js';

// 10-11-2026, as on the business's own invoices
const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const date = (at) => day.format(new Date(at)).replaceAll('/', '-');
const paise = (n) => Math.round(n * 100) / 100;

const Label = ({ children }) => <div className="mb-1 border-b border-black pb-0.5 text-[10px] font-bold tracking-[0.08em] uppercase">{children}</div>;
const Meta = ({ label, value }) => (
  <div className="grid grid-cols-[7.5rem_1fr] gap-3">
    <span className="font-semibold">{label}</span>
    <span>{value}</span>
  </div>
);
const Sum = ({ label, value, className = '' }) => (
  <tr className={className}>
    <td className="border border-black px-2 py-[3px] text-right font-semibold">{label}</td>
    <td className="border border-black px-2 py-[3px] text-right">{value}</td>
  </tr>
);

const th = 'border border-black px-1.5 py-1 font-bold';
const td = 'border border-black px-1.5 py-[3px]';

/**
 * An invoice as it comes out on A4, black and white only: printed (InvoicePrint below) and in its preview and PDF
 * (DocumentPreview). Laid out as the admin's business has its own tax invoices: the seller is Tree Classics Trader at
 * its registered office (SELLER in config.js; Settings → Business details for invoices changes it), not Raave's, so
 * no logo. `seller` is
 * those settings, `buyer` the showroom as the invoice names it ({ name, address, phone, gstin, state }). The amounts
 * are the invoice's, as the server worked them out: each product at its cost price (D.Rate), its GST as CGST + SGST
 * when the showroom is in the admin's state (Tamil Nadu) and IGST to any other, and the total rounded to the rupee.
 * (An invoice raised before that has no GST on its lines: it prints its amounts with GST 0.) The e-way bill isn't on
 * it: that is made after payment.
 * Each top-level part stays whole on a page; only the table's rows are shared out over pages (lib/docPages.js).
 */
export const InvoiceDocument = ({ invoice, seller, buyer }) => {
  const lines = invoice.lines.map((l) => ({ ...l, hsn: findProduct(l.code)?.hsn ?? '', gst: l.gst ?? 0, tax: l.tax ?? 0 }));
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
  const sellerLines = (seller.bizAddress?.trim() || SELLER.address).split('\n').filter(Boolean);
  const sellerGstin = seller.bizGstin?.trim() || SELLER.gstin;
  const home = sellerState(seller);
  const phone = seller.bizPhone?.trim() || SELLER.phone;
  const contact = [phone && `Ph: ${phone}`, seller.bizEmail, seller.bizPan && `PAN: ${seller.bizPan}`].filter(Boolean);
  const bank = [seller.bankName, seller.bankAccount && `A/c ${seller.bankAccount}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`].filter(Boolean);
  const terms = seller.invoiceTerms?.trim();

  return (
    <div className="relative text-[11px] leading-normal text-black">
      {invoice.status === 'cancelled' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
          <span className="-rotate-12 border-4 border-black/30 px-6 py-2 text-[64px] font-bold tracking-[0.2em] text-black/20">CANCELLED</span>
        </div>
      )}

      <div>
        <div className="text-center leading-snug">
          <div className="text-[22px] font-bold tracking-[0.03em]">{sellerName}</div>
          {sellerLines.map((l) => (
            <div key={l} className="text-[10.5px]">
              {l}
            </div>
          ))}
          {contact.length > 0 && <div className="text-[10.5px]">{contact.join('  |  ')}</div>}
          <div className="text-[10.5px] font-bold">
            GSTIN: {sellerGstin}  |  State: {seller.bizState?.trim() || stateName(home)} ({home})
          </div>
        </div>

        <div className="mt-3 border-y-2 border-black py-1 text-center text-[15px] font-bold tracking-[0.2em]">TAX INVOICE</div>

        <div className="mt-3 grid grid-cols-[1fr_17rem] gap-10">
          <div>
            <Label>Bill to</Label>
            <div className="text-[11.5px] font-bold">{buyer.name}</div>
            {buyerLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            {buyer.phone && <div>Ph: {buyer.phone}</div>}
            <div className="font-bold">GSTIN: {buyer.gstin || '____________'}</div>
          </div>
          <div>
            <Label>Invoice details</Label>
            <Meta label="Invoice No." value={<span className="font-bold">{invoice.number}</span>} />
            <Meta label="Invoice Date" value={date(invoice.createdAt)} />
            <Meta label="Place of Supply" value={place ? `${stateName(place)} (${place})` : '—'} />
          </div>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[10.5px] tabular-nums">
        <thead>
          <tr className="text-center">
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
            <tr key={l.code}>
              <td className={`${td} text-center`}>{i + 1}</td>
              <td className={`${td} text-center whitespace-nowrap`}>{l.code}</td>
              <td className={td}>{l.name}</td>
              <td className={`${td} text-center`}>{l.hsn}</td>
              {rate == null && <td className={`${td} text-center`}>{l.gst}%</td>}
              <td className={`${td} text-center`}>{l.qty}</td>
              <td className={`${td} text-right`}>{amount(l.rate)}</td>
              <td className={`${td} text-right`}>{amount(l.amount)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={rate == null ? 5 : 4} className={`${td} text-right`}>
              Total
            </td>
            <td className={`${td} text-center`}>{lines.reduce((s, l) => s + l.qty, 0)}</td>
            <td className={td} />
            <td className={`${td} text-right`}>{amount(taxable)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex items-start justify-between gap-8 break-inside-avoid">
        <div className="max-w-[55%] text-[10.5px]">
          <div className="font-bold">Amount in words: {inWords(grand)}</div>
          {invoice.note && (
            <div className="mt-2">
              <span className="font-semibold">Note: </span>
              {invoice.note}
            </div>
          )}
        </div>
        <table className="w-[17rem] border-collapse text-[10.5px] tabular-nums">
          <tbody>
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
            <Sum label="GRAND TOTAL (₹)" value={amount(grand)} className="text-[12.5px] font-bold [&>td]:border-2 [&>td]:py-1" />
          </tbody>
        </table>
      </div>

      {(bank.length > 0 || terms) && (
        <div className="mt-4 grid grid-cols-2 gap-10 break-inside-avoid text-[10.5px]">
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

      <div className="mt-8 break-inside-avoid text-[10.5px]">
        <div className="text-right font-bold">For {sellerName}</div>
        <div className="mt-14 flex justify-between">
          <span>Receiver&rsquo;s Signature</span>
          <span>Authorised Signatory</span>
        </div>
      </div>
    </div>
  );
};

/** An invoice on an A4 page (the `quote` page in index.css). Hidden on screen; it is the only thing that prints while
 *  it is on the page. */
const InvoicePrint = (props) => (
  <div className="hidden [page:quote] print:block">
    <InvoiceDocument {...props} />
  </div>
);

export default InvoicePrint;
