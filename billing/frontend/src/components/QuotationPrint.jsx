import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { gstLines } from '../lib/bill.js';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';

const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const GREEN = 'text-[#175c26]';
const Box = ({ title, children }) => (
  <div className="rounded-md border border-[#175c26]/40 px-3 py-2">
    <div className={`mb-1 text-[10px] font-bold tracking-[0.14em] uppercase ${GREEN}`}>{title}</div>
    {children}
  </div>
);
const Meta = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="w-24 shrink-0 text-black/55">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

/**
 * A quotation on an A4 page (the `quote` page in index.css). Hidden on screen; only it prints. The logo heads
 * the page; a bold diagonal QUOTATION watermark sits behind every page; and the page says plainly, twice,
 * that this is not a bill and no payment is to be made against it. Brand colours print where the printer
 * has colour, and read as greys on a black-and-white one.
 */
const QuotationPrint = ({ quote }) => {
  const shop = locationById(quote.location) ?? {};
  const { totals } = quote;
  return (
    <div className="hidden text-[12px] leading-snug text-black [page:quote] [print-color-adjust:exact] print:block">
      {/* fixed, so the browser repeats it on every printed page */}
      <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <div className="rotate-[-35deg] text-center leading-none">
          <div className="font-display text-[165px] font-bold tracking-[0.05em] text-black/[0.13] [-webkit-text-stroke:3px_rgb(0_0_0/0.16)]">
            QUOTATION
          </div>
          <div className="mt-5 text-[50px] font-black tracking-[0.18em] text-black/[0.13]">NOT A BILL · DO NOT PAY</div>
        </div>
      </div>

      <div className="relative">
        {/* header: the logo and showroom, and the document title */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <img src={logo} alt={BRAND.name} className="h-[76px] w-auto" />
            <div className="pt-1 text-[11px] leading-snug text-black/75">
              <div className="font-semibold text-black">
                {shop.city ? `${shop.city} showroom · ${shop.area}` : BRAND.name}
              </div>
              {(shop.address ?? []).map((a) => (
                <div key={a}>{a}</div>
              ))}
              {shop.phone && <div>Ph: {shop.phone}</div>}
              {shop.gstin && <div>GSTIN: {shop.gstin}</div>}
              {BRAND.email && <div>{BRAND.email}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-display text-[30px] leading-none font-bold tracking-[0.1em] ${GREEN}`}>QUOTATION</div>
            <div className="mt-2 inline-block rounded border-2 border-[#b8141b] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.12em] text-[#b8141b]">
              NOT A BILL · NOT A TAX INVOICE
            </div>
            <div className="mt-2 font-mono text-[12px] font-semibold">{quote.quoteNo}</div>
          </div>
        </div>
        <div className="mt-3 h-[3px] rounded bg-[#175c26]" />
        <div className="mt-[2px] h-px bg-[#ed1c24]" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Box title="Quoted for">
            <div className="text-[14px] font-semibold">{quote.name || '—'}</div>
            <div>{quote.phone ? formatMobile(quote.phone) : '—'}</div>
          </Box>
          <Box title="Quotation details">
            <Meta label="Date" value={dateTime.format(new Date(quote.at))} />
            <Meta label="Valid until" value={date.format(new Date(quote.validUntil))} />
            <Meta label="Prepared by" value={`${quote.by} showroom`} />
          </Box>
        </div>

        <table className="mt-4 w-full border-collapse overflow-hidden rounded-md tabular-nums">
          <thead>
            <tr className="bg-[#175c26] text-left text-[10.5px] tracking-[0.08em] text-white uppercase">
              <th className="py-2 pr-2 pl-3">#</th>
              <th className="py-2 pr-2">Code</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">MRP</th>
              <th className="py-2 pr-2 text-right">Rate</th>
              <th className="py-2 pr-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={l.code} className={`border-b border-black/10 ${i % 2 ? 'bg-[#f3f8f4]' : ''}`}>
                <td className="py-1.5 pr-2 pl-3 text-black/55">{i + 1}</td>
                <td className="py-1.5 pr-2 font-mono text-[11px]">{l.code}</td>
                <td className="py-1.5 pr-2 font-medium">{l.name}</td>
                <td className="py-1.5 pr-2 text-right">{l.qty}</td>
                <td className="py-1.5 pr-2 text-right text-black/55">{amount(l.mrp)}</td>
                <td className="py-1.5 pr-2 text-right">{amount(l.price)}</td>
                <td className="py-1.5 pr-3 text-right font-semibold">{amount(l.price * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="max-w-[55%] text-[11px] text-black/70">
            {quote.note && (
              <div className="mb-2">
                <span className="font-semibold text-black">Note: </span>
                {quote.note}
              </div>
            )}
            <div>
              {totals.count} items · {totals.qty} qty. Prices include GST.
            </div>
          </div>
          <div className="w-72 rounded-md border border-[#175c26]/40 px-3 py-2">
            <div className="flex justify-between">
              <span>MRP total</span>
              <span>{amount(totals.mrpTotal)}</span>
            </div>
            {totals.savings > 0 && (
              <div className={`flex justify-between ${GREEN}`}>
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
            <div className="-mx-3 mt-2 -mb-2 flex justify-between rounded-b-md bg-[#175c26] px-3 py-2 text-[15px] font-bold text-white">
              <span>Quoted total</span>
              <span>{inr(totals.payable)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md border-2 border-[#b8141b] bg-[#fdecec] p-3 text-center">
          <div className="text-[13px] font-bold tracking-[0.06em] text-[#b8141b]">THIS IS A QUOTATION ONLY. IT IS NOT A BILL OR TAX INVOICE.</div>
          <div className="mt-1">
            Do not make any payment against this document. A bill is issued only at the time of purchase. Prices and availability
            are valid until {date.format(new Date(quote.validUntil))} and may change after that.
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-black/15 pt-2 text-[11px] text-black/55">
          <span>
            {BRAND.name} · {BRAND.tagline}
          </span>
          <span className={`font-display text-[13px] ${GREEN}`}>Thank you &amp; Merry Christmas!</span>
        </div>
      </div>
    </div>
  );
};

export default QuotationPrint;
