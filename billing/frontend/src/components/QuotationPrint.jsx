import logo from '../assets/logo.svg';
import { BRAND, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { gstLines } from '../lib/bill.js';
import { formatMobile } from '../lib/customer.js';
import { amount, inr } from '../lib/money.js';
import { useDoc, useDocTable } from '../lib/docLook.js';
import { useQuoteColour } from '../lib/quoteColour.js';
import { DocFoot, DocFrame, DocHead, DocSums, Meta, Parties, PartyBox } from './DocParts.jsx';

const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

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
 * The quotation itself, as it comes out on A4: printed (QuotationPrint below) and in its preview and PDF
 * (DocumentPreview). In the look the admin picked (Settings → Documents; `look` overrides it for a preview there) and
 * the colours picked (lib/quoteColour.js), made of the shared parts in DocParts.jsx with QUOTATION at the top of the
 * page; black and white keeps it to ink only, for a plain laser printer. The showroom and its logo issue it, and it
 * says plainly that this is not a bill and no payment is to be made against it. Each top-level part stays whole on a
 * page; only the table's rows are shared out over pages (lib/docPages.js).
 */
export const QuotationDocument = ({ quote, pictures = {}, colour, look }) => {
  const shop = locationById(quote.location) ?? {};
  const settings = useStore().settings;
  const { showGst, composition } = settings;
  const gst = showGst && !composition; // a composition dealer shows no GST
  // Same identity as the bill: the showroom's own name is the prominent line, with Raave's as the house brand under it.
  const storeName = settings.storeName?.trim() || shop.name;
  const address = settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []);
  const phone = settings.storePhone?.trim() || shop.phone;
  const gstin = settings.gstin?.trim() || shop.gstin;
  const { totals } = quote;
  const taxLine = [composition && 'Composition Dealer', (gst || composition) && gstin && `GSTIN: ${gstin}`].filter(Boolean).join('  |  ');
  return (
    <DocFrame colour={colour} kind="quotation" look={look}>
      <DocHead
        title="QUOTATION"
        tag="Not a bill · not a tax invoice"
        number={quote.quoteNo}
        date={date.format(new Date(quote.at))}
        name={storeName || (shop.city ? `${shop.city} showroom · ${shop.area}` : BRAND.name)}
        lines={[`${BRAND.name} · ${BRAND.tagline}`, ...address]}
        contact={[phone && `Ph: ${phone}`, BRAND.email].filter(Boolean).join('  |  ')}
        taxLine={taxLine}
        logo={<img src={logo} alt={BRAND.name} className={`h-[60px] w-auto shrink-0 ${colour.mono ? 'print-ink' : ''}`} />}
      />

      <Parties>
        <PartyBox label="Quoted for">
          {quote.company && <div className="text-[13px] font-bold uppercase">{quote.company}</div>}
          <div className={quote.company ? 'font-semibold' : 'text-[13px] font-semibold'}>{quote.name || '—'}</div>
          <div>{quote.phone ? formatMobile(quote.phone) : '—'}</div>
          {quote.address && quote.address.split('\n').map((a) => <div key={a}>{a}</div>)}
          {quote.gstin && <div>GSTIN: {quote.gstin}</div>}
        </PartyBox>
        <PartyBox label="Details" tinted>
          <Meta label="Date" value={dateTime.format(new Date(quote.at))} />
          <Meta label="Valid until" value={date.format(new Date(quote.validUntil))} />
          {quote.deliveryDate && <Meta label="Delivery by (approx.)" value={date.format(new Date(`${quote.deliveryDate}T00:00:00`))} />}
          <Meta label="Prepared by" value={`${quote.by} showroom`} />
        </PartyBox>
      </Parties>

      <QuoteTable lines={quote.lines} pictures={pictures} />

      <DocSums
        note={
          <>
            {quote.note && (
              <div className="mb-2">
                <span className="font-semibold">Instructions: </span>
                {quote.note}
              </div>
            )}
            <div>
              {totals.count} items · {totals.qty} qty.{gst && ' Prices include GST.'}
            </div>
          </>
        }
        rows={[
          ['MRP total', amount(totals.mrpTotal)],
          ...(totals.savings > 0 ? [['Offer discount', `−${amount(totals.savings)}`]] : []),
          ...(gst ? [['Taxable value', amount(totals.taxable)], ...gstLines(totals.gstRows).map((g) => [g.label, amount(g.value)])] : []),
        ]}
        grand={['Quoted total', inr(totals.payable)]}
      />

      <NotABill validUntil={quote.validUntil} />

      <DocFoot>
        {BRAND.name} · {BRAND.tagline} · <span className="font-display text-(--q-accent) italic">Thank you &amp; Merry Christmas!</span>
      </DocFoot>
    </DocFrame>
  );
};

/** The quotation's lines: a top-level <table> of the frame (so its rows are shared out over the pages), in the
 *  frame's look. The products' pictures ({ code: data URL }) get a column only if any has one. */
const QuoteTable = ({ lines, pictures }) => {
  const t = useDocTable();
  const withPictures = lines.some((l) => pictures[l.code]);
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={t.th}>#</th>
          {withPictures && <th className={t.th} aria-label="Picture" />}
          <th className={t.th}>Code</th>
          <th className={`${t.th} text-left`}>Item</th>
          <th className={`${t.th} text-right`}>Qty</th>
          <th className={`${t.th} text-right`}>MRP</th>
          <th className={`${t.th} text-right`}>Rate</th>
          <th className={`${t.th} text-right`}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={l.code} className={`${t.row} align-top break-inside-avoid`}>
            <td className={`${t.td} text-center`}>{i + 1}</td>
            {withPictures && (
              <td className={t.td}>
                {pictures[l.code] && <img src={pictures[l.code]} alt={l.name} className="size-16 border border-(--q-line) bg-white object-contain" />}
              </td>
            )}
            <td className={`${t.td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
            <td className={t.td}>{l.name}</td>
            <td className={`${t.td} text-right`}>{l.qty}</td>
            <td className={`${t.td} text-right`}>{amount(l.mrp)}</td>
            <td className={`${t.td} text-right`}>{amount(l.price)}</td>
            <td className={`${t.td} text-right font-semibold`}>{amount(l.price * l.qty)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** The plain warning at the foot that this is a quotation, not a bill, in the frame's look. */
const NotABill = ({ validUntil }) => {
  const { look, mono } = useDoc();
  const box =
    look === 'clean'
      ? 'border-y border-(--q-accent) py-2.5'
      : look === 'classic'
        ? `border border-(--q-accent) p-3 ${mono ? '' : 'bg-(--q-soft)'}`
        : `rounded-md border-2 border-(--q-accent) p-3 ${mono ? '' : 'bg-(--q-soft)'}`;
  return (
    <div className={`mt-8 text-center break-inside-avoid ${box}`}>
      <div className="text-[12px] font-bold tracking-[0.08em] text-(--q-accent)">THIS IS A QUOTATION ONLY. IT IS NOT A BILL OR TAX INVOICE.</div>
      <div className="mt-1">
        Do not make any payment against this document. A bill is issued only at the time of purchase. Prices and availability are valid until{' '}
        {date.format(new Date(validUntil))} and may change after that.
      </div>
    </div>
  );
};

/**
 * A quotation on an A4 page (the `quote` page in index.css), in the colours picked on its preview. Hidden on screen;
 * only it prints. An outlined QUOTATION watermark sits behind every page. Printed on a narrow receipt printer, only a
 * blunt "not a bill" notice comes out.
 */
const QuotationPrint = ({ quote, pictures = {}, look }) => {
  const colour = useQuoteColour();
  return (
    <div className="hidden [page:quote] print:block">
      <NarrowNotice />

      <div className="quote-page">
        {/* fixed, so the browser repeats it on every printed page */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center" aria-hidden="true">
          <div
            style={{ '--q-mark': colour.mark }}
            className="rotate-[-35deg] font-display text-[150px] leading-none font-bold tracking-[0.06em] text-transparent [-webkit-text-stroke:1.5px_var(--q-mark)]"
          >
            QUOTATION
          </div>
        </div>

        <div className="relative">
          <QuotationDocument quote={quote} pictures={pictures} colour={colour} look={look} />
        </div>
      </div>
    </div>
  );
};

export default QuotationPrint;
