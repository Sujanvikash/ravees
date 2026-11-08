import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { gstLines } from '../lib/bill.js';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';

const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

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

/** What prints instead when a quotation is sent to a narrow receipt printer: it must never pass for a bill. */
const NarrowNotice = () => (
  <div className="quote-narrow text-center font-mono text-black">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="border-y-4 border-black py-3 text-[20px] leading-tight font-black tracking-widest">
        QUOTATION
        <br />
        NOT A BILL
        <br />
        <span className="text-[12px]">DO NOT PAY · PRINT THIS ON A4</span>
      </div>
    ))}
  </div>
);

/**
 * A quotation on an A4 page (the `quote` page in index.css), in black and white only. Hidden on screen; only it
 * prints. The logo heads the page, an outlined QUOTATION watermark sits behind every page, and the page says
 * plainly that this is not a bill and no payment is to be made against it. Printed on a narrow receipt printer,
 * only a blunt "not a bill" notice comes out.
 */
const QuotationPrint = ({ quote, pictures = {} }) => {
  const shop = locationById(quote.location) ?? {};
  const settings = useStore().settings;
  const { showGst, composition } = settings;
  const gst = showGst && !composition; // a composition dealer shows no GST
  // Same identity as the bill: the showroom's own name is the prominent line, with Raave's as the house brand under it.
  const storeName = settings.storeName?.trim();
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  const { totals } = quote;
  // the products' pictures ({ code: data URL }), colour on the otherwise black-and-white page; the column shows only if any has one
  const withPictures = quote.lines.some((l) => pictures[l.code]);
  return (
    <div className="hidden text-[11.5px] leading-normal text-black [page:quote] print:block">
      <NarrowNotice />

      <div className="quote-page">
        {/* fixed, so the browser repeats it on every printed page */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center" aria-hidden="true">
          <div className="rotate-[-35deg] font-display text-[150px] leading-none font-bold tracking-[0.06em] text-transparent [-webkit-text-stroke:1.5px_rgb(0_0_0/0.14)]">
            QUOTATION
          </div>
        </div>

        <div className="relative">
          {/* header: the logo and showroom on the left, the document on the right */}
          <div className="flex items-start justify-between gap-8 border-b-2 border-black pb-4">
            <div className="flex items-start gap-4">
              <img src={logo} alt={BRAND.name} className="print-ink h-[64px] w-auto" />
              <div className="text-[10.5px] leading-snug">
                <div className="text-[16px] leading-tight font-bold uppercase">
                  {storeName || (shop.city ? `${shop.city} showroom · ${shop.area}` : BRAND.name)}
                </div>
                <div className="mb-0.5 text-[9.5px] font-semibold tracking-wide text-black/70">
                  {BRAND.name} · {BRAND.tagline}
                </div>
                {address.map((a) => (
                  <div key={a}>{a}</div>
                ))}
                {phone && <div>Ph: {phone}</div>}
                {gst && gstin && <div>GSTIN: {gstin}</div>}
                {BRAND.email && <div>{BRAND.email}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[28px] leading-none font-bold tracking-[0.12em]">QUOTATION</div>
              <div className="mt-1.5 text-[9.5px] font-bold tracking-[0.16em]">NOT A BILL · NOT A TAX INVOICE</div>
              <div className="mt-2 font-mono text-[12px] font-semibold">{quote.quoteNo}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-10">
            <div>
              <Label>Quoted for</Label>
              <div className="text-[14px] font-semibold">{quote.name || '—'}</div>
              <div>{quote.phone ? formatMobile(quote.phone) : '—'}</div>
            </div>
            <div>
              <Label>Details</Label>
              <Meta label="Date" value={dateTime.format(new Date(quote.at))} />
              <Meta label="Valid until" value={date.format(new Date(quote.validUntil))} />
              <Meta label="Prepared by" value={`${quote.by} showroom`} />
            </div>
          </div>

          <table className="mt-6 w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-y-2 border-black text-left text-[9.5px] tracking-[0.14em] uppercase">
                <th className="py-1.5 pr-2 font-bold">#</th>
                {withPictures && <th className="py-1.5 pr-2 font-bold" aria-label="Picture" />}
                <th className="py-1.5 pr-2 font-bold">Code</th>
                <th className="py-1.5 pr-2 font-bold">Item</th>
                <th className="py-1.5 pr-2 text-right font-bold">Qty</th>
                <th className="py-1.5 pr-2 text-right font-bold">MRP</th>
                <th className="py-1.5 pr-2 text-right font-bold">Rate</th>
                <th className="py-1.5 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((l, i) => (
                <tr key={l.code} className="border-b border-black/25 align-top break-inside-avoid">
                  <td className="py-1.5 pr-2">{i + 1}</td>
                  {withPictures && (
                    <td className="py-1.5 pr-2">
                      {pictures[l.code] && (
                        <img
                          src={pictures[l.code]}
                          alt={l.name}
                          className="size-16 border border-black/25 object-contain [print-color-adjust:exact]"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-1.5 pr-2 font-mono text-[10.5px]">{l.code}</td>
                  <td className="py-1.5 pr-2">{l.name}</td>
                  <td className="py-1.5 pr-2 text-right">{l.qty}</td>
                  <td className="py-1.5 pr-2 text-right">{amount(l.mrp)}</td>
                  <td className="py-1.5 pr-2 text-right">{amount(l.price)}</td>
                  <td className="py-1.5 text-right font-semibold">{amount(l.price * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex items-start justify-between gap-10 break-inside-avoid">
            <div className="max-w-[55%] text-[11px]">
              {quote.note && (
                <div className="mb-2">
                  <span className="font-semibold">Note: </span>
                  {quote.note}
                </div>
              )}
              <div>
                {totals.count} items · {totals.qty} qty.{gst && ' Prices include GST.'}
              </div>
            </div>
            <div className="w-64">
              <Sum label="MRP total" value={amount(totals.mrpTotal)} />
              {totals.savings > 0 && <Sum label="Offer discount" value={`−${amount(totals.savings)}`} />}
              {gst && <Sum label="Taxable value" value={amount(totals.taxable)} />}
              {gst && gstLines(totals.gstRows).map((g) => <Sum key={g.label} label={g.label} value={amount(g.value)} />)}
              <Sum label="Quoted total" value={inr(totals.payable)} className="mt-1.5 border-y-2 border-black py-1.5 text-[14px] font-bold" />
            </div>
          </div>

          <div className="mt-8 border-2 border-black p-3 text-center break-inside-avoid">
            <div className="text-[12px] font-bold tracking-[0.08em]">THIS IS A QUOTATION ONLY. IT IS NOT A BILL OR TAX INVOICE.</div>
            <div className="mt-1">
              Do not make any payment against this document. A bill is issued only at the time of purchase. Prices and availability are valid
              until {date.format(new Date(quote.validUntil))} and may change after that.
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between border-t border-black pt-2 text-[10.5px]">
            <span>
              {BRAND.name} · {BRAND.tagline}
            </span>
            <span className="font-display italic">Thank you &amp; Merry Christmas!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPrint;
