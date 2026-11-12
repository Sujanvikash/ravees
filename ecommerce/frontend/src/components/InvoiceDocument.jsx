import { Printer } from 'lucide-react';
import Button from './Button.jsx';
import Logo from './Logo.jsx';
import { formatDate } from '../lib/format.js';

// Every amount with paise, the way an invoice prints them: 1234.5 → "1,234.50".
const AMOUNT = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value) => AMOUNT.format(Number(value) || 0);

const LABEL = 'text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-gold-ink';
const CELL = 'border-b border-ink/10 px-2 py-2 align-top';
const NUM = `${CELL} text-right tabular-nums`;

/**
 * A paid order's tax invoice (`order.invoice` from the shop API), as a white A4 page in ink: the seller with
 * its GSTIN, the customer and the place of supply, the lines with their HSN and taxable value, then the GST
 * (CGST + SGST within the seller's state, IGST otherwise), the total in figures and words, and the payment.
 * Every amount already includes GST; the API works the tax back from what was paid, so it adds up exactly.
 *
 * It sits in `.print-area`: printing (or "Save as PDF") prints the invoice alone, without the page around it.
 * Shared by the customer's order page and the admin.
 */
const InvoiceDocument = ({ invoice }) => {
  const { seller, buyer } = invoice;
  const half = invoice.gstRate / 2;
  const taxes = invoice.intraState
    ? [
        [`CGST @ ${half}%`, invoice.cgst],
        [`SGST @ ${half}%`, invoice.sgst],
      ]
    : [[`IGST @ ${invoice.gstRate}%`, invoice.igst]];

  return (
    <div className="print-area mx-auto w-full max-w-[820px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[0.82rem] text-text-muted">Print it, or choose “Save as PDF” in the print window to download it.</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={15} strokeWidth={2} />
          Print / Save as PDF
        </Button>
      </div>

      <article className="rounded-lg border border-ink/15 bg-white p-6 text-[0.8rem] leading-[1.5] text-ink shadow-[0_10px_30px_--alpha(var(--color-shadow)/20%)] sm:p-9 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b-2 border-forest pb-5">
          <div className="flex flex-col gap-3">
            <Logo height={52} className="shadow-none! print:shadow-none" />
            <div>
              <p className="font-serif text-[1.05rem] font-bold">{seller.name}</p>
              {seller.address.split('\n').map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>
                {seller.state} ({seller.stateCode})
                {seller.phone && <> · {seller.phone}</>}
              </p>
              {seller.email && <p>{seller.email}</p>}
              {seller.gstin && (
                <p className="font-semibold">
                  GSTIN: <span className="font-mono">{seller.gstin}</span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-serif text-[1.5rem] font-bold tracking-[0.06em] text-forest uppercase">Tax Invoice</h1>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5">
              <dt className="text-ink-soft">Invoice no.</dt>
              <dd className="font-mono font-semibold">{invoice.number}</dd>
              <dt className="text-ink-soft">Invoice date</dt>
              <dd>{formatDate(invoice.date)}</dd>
              <dt className="text-ink-soft">Order no.</dt>
              <dd className="font-mono">{invoice.orderNumber}</dd>
            </dl>
          </div>
        </header>

        <section className="grid gap-5 border-b border-ink/10 py-5 sm:grid-cols-2">
          <div>
            <h2 className={LABEL}>Bill to / Ship to</h2>
            <p className="mt-1 font-semibold">{buyer.name}</p>
            {buyer.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {buyer.phone && <p>Phone: {buyer.phone}</p>}
            {buyer.email && <p>{buyer.email}</p>}
          </div>
          <div className="sm:text-right">
            <h2 className={LABEL}>Place of supply</h2>
            <p className="mt-1 font-semibold">{invoice.placeOfSupply}</p>
            <p className="text-ink-soft">{invoice.intraState ? 'Within the state: CGST + SGST' : 'Inter-state: IGST'}</p>
          </div>
        </section>

        {/* Narrow screens scroll the table sideways; print always has room for it. */}
        <div className="overflow-x-auto py-4">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="bg-forest/8 text-left text-[0.7rem] uppercase tracking-[0.06em] text-ink-soft">
                <th className={`${CELL} w-8`}>#</th>
                <th className={CELL}>Description</th>
                <th className={CELL}>HSN/SAC</th>
                <th className={`${NUM} w-12`}>Qty</th>
                <th className={NUM}>Rate</th>
                <th className={NUM}>Taxable value</th>
                <th className={NUM}>GST {invoice.gstRate}%</th>
                <th className={NUM}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => (
                <tr key={`${line.description}-${i}`}>
                  <td className={CELL}>{i + 1}</td>
                  <td className={CELL}>{line.description}</td>
                  <td className={`${CELL} font-mono`}>{line.hsn}</td>
                  <td className={NUM}>{line.qty}</td>
                  <td className={NUM}>{money(line.rate)}</td>
                  <td className={NUM}>{money(line.taxable)}</td>
                  <td className={NUM}>{money(line.tax)}</td>
                  <td className={`${NUM} font-semibold`}>{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <h2 className={LABEL}>Amount in words</h2>
            <p className="mt-1 font-semibold">{invoice.amountInWords}</p>
            <h2 className={`${LABEL} mt-4`}>Payment</h2>
            <p className="mt-1">
              {/* Without a Razorpay payment the admin marked it paid (a bank transfer, say). */}
              {invoice.paymentId ? 'Paid online (Razorpay)' : 'Paid'}
              {invoice.paidAt && <> on {formatDate(invoice.paidAt, true)}</>}
              {invoice.paymentId && (
                <>
                  , payment ID <span className="font-mono">{invoice.paymentId}</span>
                </>
              )}
            </p>
          </div>
          <dl className="grid min-w-[260px] grid-cols-[1fr_auto] gap-y-1 self-start [&_dd]:pl-6">
            <dt className="text-ink-soft">Taxable value</dt>
            <dd className="text-right tabular-nums">₹{money(invoice.taxable)}</dd>
            {taxes.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="text-right tabular-nums">₹{money(value)}</dd>
              </div>
            ))}
            <dt className="mt-1 border-t-2 border-forest pt-2 text-[0.95rem] font-bold">Total</dt>
            <dd className="mt-1 border-t-2 border-forest pt-2 text-right text-[0.95rem] font-bold tabular-nums">₹{money(invoice.total)}</dd>
          </dl>
        </section>

        <footer className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-4 text-[0.72rem] text-ink-soft">
          <p className="max-w-[440px]">
            Prices include GST. This is a computer-generated invoice and needs no signature. Thank you for shopping with
            Raave&apos;s Evergreen.
          </p>
          <p className="text-right">
            For <span className="font-semibold text-ink">{seller.name}</span>
            <br />
            Authorised Signatory
          </p>
        </footer>
      </article>
    </div>
  );
};

export default InvoiceDocument;
