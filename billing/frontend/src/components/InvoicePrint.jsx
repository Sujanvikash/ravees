import logo from '../assets/logo.svg';
import { BRAND } from '../config.js';
import { findProduct } from '../lib/catalogue.js';
import { sellerState, stateName, stateOfGstin } from '../lib/gst.js';
import { amount, inr, inWords } from '../lib/money.js';

const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const Label = ({ children }) => <div className="mb-1 text-[9.5px] font-bold tracking-[0.16em] text-black uppercase">{children}</div>;
const Meta = ({ label, value }) =>
  value ? (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  ) : null;
const Sum = ({ label, value, className = '' }) => (
  <div className={`flex justify-between gap-4 py-0.5 ${className}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/**
 * An invoice as it comes out on A4, black and white only: printed (InvoicePrint below) and in its preview and PDF
 * (DocumentPreview). `seller` is the admin's business (Settings → Business details for
 * invoices), `buyer` the showroom as the invoice names it ({ name, address, phone, gstin, state }). The amounts are the
 * invoice's, as the server worked them out: each product at its cost price (D.Rate) with its GST on top, CGST + SGST
 * when the showroom is in the admin's state (Tamil Nadu) and IGST to any other. (An invoice raised before that has no
 * GST on its lines: it prints its amounts with GST 0.) The e-way bill isn't on it: that is made after payment.
 * Each top-level part stays whole on a page; only the table's rows are shared out over pages (lib/docPages.js).
 */
export const InvoiceDocument = ({ invoice, seller, buyer }) => {
  const lines = invoice.lines.map((l) => ({ ...l, hsn: findProduct(l.code)?.hsn ?? '', gst: l.gst ?? 0, tax: l.tax ?? 0 }));
  const place = buyer.state || stateOfGstin(buyer.gstin);
  const same = invoice.interState != null ? !invoice.interState : place === sellerState(seller);
  const buyerLines = (buyer.address ?? '').split('\n').filter(Boolean);
  const taxable = lines.reduce((s, l) => s + l.amount, 0);
  const tax = Math.round(lines.reduce((s, l) => s + l.tax, 0) * 100) / 100;
  const half = Math.round(tax * 50) / 100;
  const grand = invoice.total;
  const sellerName = seller.bizName?.trim() || BRAND.name;
  const sellerLines = (seller.bizAddress ?? '').split('\n').filter(Boolean);
  const bank = [seller.bankName, seller.bankAccount && `A/c ${seller.bankAccount}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`].filter(Boolean);

  return (
    <div className="relative text-[11px] leading-normal text-black">
      {invoice.status === 'cancelled' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
          <span className="-rotate-12 border-4 border-black/30 px-6 py-2 text-[64px] font-bold tracking-[0.2em] text-black/20">CANCELLED</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-8 border-b-2 border-black pb-3">
        <div className="flex items-start gap-4">
          <img src={logo} alt={sellerName} className="print-ink h-[64px] w-auto" />
          <div className="text-[10.5px] leading-snug">
            <div className="text-[13px] font-bold">{sellerName}</div>
            {sellerLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            {seller.bizState && <div>{seller.bizState}</div>}
            {seller.bizPhone && <div>Ph: {seller.bizPhone}</div>}
            {(seller.bizEmail || BRAND.email) && <div>{seller.bizEmail || BRAND.email}</div>}
            {seller.bizGstin && <div className="font-semibold">GSTIN: {seller.bizGstin}</div>}
            {seller.bizPan && <div>PAN: {seller.bizPan}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[24px] leading-none font-bold tracking-[0.12em]">TAX INVOICE</div>
          <div className="mt-2 font-mono text-[12px] font-semibold">{invoice.number}</div>
          <div className="mt-0.5 text-[10px]">Original for recipient</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] gap-8">
        <div>
          <Label>Bill to / Ship to</Label>
          <div className="text-[11.5px] font-bold">{buyer.name}</div>
          {buyerLines.map((l) => (
            <div key={l}>{l}</div>
          ))}
          {buyer.phone && <div>Ph: {buyer.phone}</div>}
          {buyer.gstin ? <div className="font-semibold">GSTIN: {buyer.gstin}</div> : <div>GSTIN: ____________</div>}
        </div>
        <div>
          <Label>Invoice</Label>
          <Meta label="Date" value={date.format(new Date(invoice.createdAt))} />
          <Meta label="Invoice no." value={invoice.number} />
          {invoice.boxIds.length > 0 && <Meta label="Boxes" value={String(invoice.boxIds.length)} />}
          <Meta label="Place of supply" value={place ? `${stateName(place)} (${place})` : ''} />
          <Meta label="Supply" value={same ? 'Within the state' : 'Inter-state'} />
        </div>
        <div>
          <Label>Payment</Label>
          <Meta label="Payment" value={invoice.status === 'raised' ? 'Due' : invoice.status === 'cancelled' ? '—' : 'Paid'} />
          <Meta label="Reference" value={invoice.paidRef} />
        </div>
      </div>

      <table className="mt-5 w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-y-2 border-black text-left text-[9px] tracking-[0.1em] uppercase">
            <th className="py-1.5 pr-2 font-bold">#</th>
            <th className="py-1.5 pr-2 font-bold">Description</th>
            <th className="py-1.5 pr-2 font-bold">HSN</th>
            <th className="py-1.5 pr-2 text-right font-bold">Qty</th>
            <th className="py-1.5 pr-2 text-right font-bold">Rate</th>
            <th className="py-1.5 pr-2 text-right font-bold">Amount</th>
            <th className="py-1.5 pr-2 text-right font-bold">GST %</th>
            <th className="py-1.5 pr-2 text-right font-bold">GST</th>
            <th className="py-1.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.code} className="border-b border-black/25 align-top">
              <td className="py-1.5 pr-2">{i + 1}</td>
              <td className="py-1.5 pr-2">
                {l.name}
                <span className="ml-1.5 font-mono text-[9.5px]">({l.code})</span>
              </td>
              <td className="py-1.5 pr-2 font-mono text-[10px]">{l.hsn || '—'}</td>
              <td className="py-1.5 pr-2 text-right">{l.qty} Nos</td>
              <td className="py-1.5 pr-2 text-right">{amount(l.rate)}</td>
              <td className="py-1.5 pr-2 text-right font-semibold">{amount(l.amount)}</td>
              <td className="py-1.5 pr-2 text-right">{l.gst}%</td>
              <td className="py-1.5 pr-2 text-right">{amount(l.tax)}</td>
              <td className="py-1.5 text-right font-semibold">{amount(l.amount + l.tax)}</td>
            </tr>
          ))}
          <tr className="border-b-2 border-black font-bold">
            <td colSpan={3} className="py-1.5 pr-2 text-right">
              Total
            </td>
            <td className="py-1.5 pr-2 text-right">{lines.reduce((s, l) => s + l.qty, 0)} Nos</td>
            <td />
            <td className="py-1.5 pr-2 text-right">{amount(taxable)}</td>
            <td />
            <td className="py-1.5 pr-2 text-right">{amount(tax)}</td>
            <td className="py-1.5 text-right">{amount(grand)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex items-start justify-between gap-10 break-inside-avoid">
        <div className="max-w-[55%] text-[10.5px]">
          <Label>Amount in words</Label>
          <div className="font-semibold">{inWords(grand)}</div>
          {invoice.note && (
            <div className="mt-2">
              <span className="font-semibold">Note: </span>
              {invoice.note}
            </div>
          )}
        </div>
        <div className="w-64">
          <Sum label="Taxable value" value={amount(taxable)} />
          {same ? (
            <>
              <Sum label="CGST" value={amount(half)} />
              <Sum label="SGST" value={amount(tax - half)} />
            </>
          ) : (
            <Sum label="IGST" value={amount(tax)} />
          )}
          <Sum label="Total" value={inr(grand)} className="mt-1.5 border-y-2 border-black py-1.5 text-[14px] font-bold" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-10 break-inside-avoid text-[10.5px]">
        <div>
          {bank.length > 0 && (
            <div className="mb-3">
              <Label>Bank details</Label>
              {bank.map((b) => (
                <div key={b}>{b}</div>
              ))}
            </div>
          )}
          <Label>Terms</Label>
          <div className="whitespace-pre-line">
            {seller.invoiceTerms?.trim() || 'Goods once sold will not be taken back. Subject to local jurisdiction.'}
          </div>
        </div>
        <div className="flex flex-col justify-between text-right">
          <div className="font-semibold">For {sellerName}</div>
          <div className="mt-14 border-t border-black pt-2">Authorised signatory</div>
        </div>
      </div>

      <div className="mt-5 border-t border-black pt-2 text-center text-[10px]">
        This is a computer generated invoice.
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
