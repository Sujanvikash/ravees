import { BRAND, locationById } from '../config.js';
import { gstLines } from '../lib/bill.js';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';

const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const Meta = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="w-28 shrink-0 text-black/60">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

/**
 * A quotation on an A4 page (the `quote` page in index.css). Hidden on screen; only it prints. A huge
 * diagonal QUOTATION watermark sits behind every page, and the page says plainly, twice, that this is not a
 * bill and no payment is to be made against it.
 */
const QuotationPrint = ({ quote }) => {
  const shop = locationById(quote.location) ?? {};
  const { totals } = quote;
  return (
    <div className="hidden text-[12px] leading-snug text-black [page:quote] [print-color-adjust:exact] print:block">
      {/* fixed, so the browser repeats it on every printed page */}
      <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <div className="-rotate-[35deg] text-center leading-none">
          <div className="font-display text-[150px] font-bold tracking-[0.06em] text-black/[0.07]">QUOTATION</div>
          <div className="mt-4 text-[44px] font-bold tracking-[0.2em] text-black/[0.07]">NOT A BILL · DO NOT PAY</div>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
          <div>
            <div className="font-display text-[20px] font-bold tracking-[0.1em] uppercase">{BRAND.name}</div>
            <div>{BRAND.tagline}</div>
            {(shop.address ?? []).map((a) => (
              <div key={a}>{a}</div>
            ))}
            {shop.phone && <div>Ph: {shop.phone}</div>}
            {shop.gstin && <div>GSTIN: {shop.gstin}</div>}
          </div>
          <div className="text-right">
            <div className="font-display text-[28px] font-bold tracking-[0.12em]">QUOTATION</div>
            <div className="mt-1 inline-block border-2 border-black px-2 py-0.5 text-[11px] font-bold tracking-[0.12em]">
              NOT A BILL · NOT A TAX INVOICE
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1">
          <Meta label="Quotation no." value={quote.quoteNo} />
          <Meta label="Customer" value={quote.name || '—'} />
          <Meta label="Date" value={dateTime.format(new Date(quote.at))} />
          <Meta label="Mobile" value={quote.phone ? formatMobile(quote.phone) : '—'} />
          <Meta label="Valid until" value={date.format(new Date(quote.validUntil))} />
          <Meta label="Showroom" value={shop.city ? `${shop.city} · ${shop.area}` : '—'} />
        </div>

        <table className="mt-4 w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-y-2 border-black text-left text-[11px] tracking-wide uppercase">
              <th className="py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">Code</th>
              <th className="py-1.5 pr-2">Item</th>
              <th className="py-1.5 pr-2 text-right">Qty</th>
              <th className="py-1.5 pr-2 text-right">MRP</th>
              <th className="py-1.5 pr-2 text-right">Rate</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={l.code} className="border-b border-black/20">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2 font-mono text-[11px]">{l.code}</td>
                <td className="py-1.5 pr-2">{l.name}</td>
                <td className="py-1.5 pr-2 text-right">{l.qty}</td>
                <td className="py-1.5 pr-2 text-right">{amount(l.mrp)}</td>
                <td className="py-1.5 pr-2 text-right">{amount(l.price)}</td>
                <td className="py-1.5 text-right">{amount(l.price * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <div className="w-72">
            <div className="flex justify-between">
              <span>MRP total</span>
              <span>{amount(totals.mrpTotal)}</span>
            </div>
            {totals.savings > 0 && (
              <div className="flex justify-between">
                <span>Offer discount</span>
                <span>−{amount(totals.savings)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable value</span>
              <span>{amount(totals.taxable)}</span>
            </div>
            {gstLines(totals.gstRows).map((g) => (
              <div key={g.label} className="flex justify-between">
                <span>{g.label}</span>
                <span>{amount(g.value)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-y-2 border-black py-1 text-[15px] font-bold">
              <span>Quoted total</span>
              <span>{inr(totals.payable)}</span>
            </div>
            <div className="text-right text-[11px] text-black/60">incl. GST · {totals.count} items · {totals.qty} qty</div>
          </div>
        </div>

        {quote.note && (
          <div className="mt-3">
            <span className="font-semibold">Note: </span>
            {quote.note}
          </div>
        )}

        <div className="mt-5 border-2 border-black p-3 text-center">
          <div className="text-[13px] font-bold tracking-[0.08em]">THIS IS A QUOTATION ONLY. IT IS NOT A BILL OR TAX INVOICE.</div>
          <div className="mt-1">
            Do not make any payment against this document. A bill is issued only at the time of purchase. Prices and availability
            are valid until {date.format(new Date(quote.validUntil))} and may change after that.
          </div>
        </div>

        <div className="mt-4 flex justify-between text-[11px] text-black/60">
          <span>
            Prepared by {quote.by} · {quote.quoteNo}
          </span>
          {BRAND.email && <span>{BRAND.email}</span>}
        </div>
      </div>
    </div>
  );
};

export default QuotationPrint;
