import { BILL_FOOTER, BRAND, locationById } from '../config.js';
import { countLabel, gstLines } from '../lib/bill.js';
import { useStore } from '../context/StoreContext.jsx';
import { formatMobile } from '../lib/customer.js';
import { useDoc, useDocTable, useReceiptLook } from '../lib/docLook.js';
import { amount, inr, inWords } from '../lib/money.js';
import { usePaper } from '../lib/paper.js';
import { methodLabel } from '../lib/payment.js';
import { useQuoteColour } from '../lib/quoteColour.js';
import { shortName } from '../lib/shortName.js';
import { DocFoot, DocFrame, DocHead, DocSums, Label, Meta, Parties, PartyBox, SignOff } from './DocParts.jsx';
import { Line, Slip, SlipBox, SlipColumns, SlipFoot, SlipHead, SlipItems, SlipTitle, SlipTotal, SlipWish } from './ThermalParts.jsx';

const when = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// A Christmas wish at the foot of every bill.
const WISHES = [
  'May your tree shine bright and your home be full of joy this Christmas.',
  'Wishing you warm lights, sweet carols and a season of peace.',
  'May every ornament you hang carry a happy memory. Merry Christmas!',
  'Here’s to twinkling lights, full tables and the people you love.',
  'May the magic of Christmas fill your home and stay all year.',
  'Thank you for making us part of your celebrations. Joy to your world!',
  'Wishing you a sparkling Christmas and a bright New Year.',
  'May your days be merry, your evenings glow, and your tree stand tall.',
];

/** The same bill always gets the same wish, so a reprint matches the first copy. */
const wishFor = (billNo = '') => WISHES[[...billNo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % WISHES.length];

/** The showroom as its bills name it: its own details from Settings → Shop on the bill, or the built-in ones for a
 *  field left blank. A composition dealer bills a "Bill of Supply": no GST is shown (the price already includes it).
 *  `own` ({ storeName, storeAddress, storePhone, gstin, composition }, as in settings) stands in for the saved
 *  details: the details being typed on Settings → Shop on the bill, shown on its sample bill as they are typed. */
const useShopOnBill = (location, own) => {
  const { settings: saved } = useStore();
  const settings = own ? { ...saved, ...own } : saved;
  const shop = locationById(location) ?? {};
  const composition = Boolean(settings.composition);
  const gst = settings.showGst && !composition;
  return {
    shop,
    composition,
    gst,
    storeName: settings.storeName?.trim() || shop.name,
    address: settings.storeAddress?.trim() ? settings.storeAddress.split('\n').filter(Boolean) : (shop.address ?? []),
    phone: settings.storePhone?.trim() || shop.phone,
    gstin: settings.gstin?.trim() || shop.gstin,
    title: composition ? 'BILL OF SUPPLY' : gst ? 'TAX INVOICE' : 'INVOICE',
  };
};

/** How a bill was paid, line by line (the same on the 80mm and the A4 bill). */
const paidLines = (payment) => [
  ...(payment.credit > 0 ? [{ label: `Exchange credit ${payment.creditNote ?? ''}`.trim(), value: amount(-payment.credit), bold: true }] : []),
  ...(payment.method === 'credit' || payment.method === 'later'
    ? []
    : payment.split
      ? [
          payment.split.cash > 0 && { label: 'Paid · Cash', value: amount(payment.split.cash) },
          payment.split.upi > 0 && { label: 'Paid · UPI', value: amount(payment.split.upi) },
          payment.split.card > 0 && { label: 'Paid · Card', value: amount(payment.split.card) },
        ].filter(Boolean)
      : [{ label: `Paid · ${methodLabel(payment.method)}`, value: amount(payment.received) }]),
  ...(payment.change > 0 ? [{ label: 'Change', value: amount(payment.change), bold: true }] : []),
  ...(payment.approval ? [{ label: 'Card approval', value: payment.approval }] : []),
  ...(payment.later > 0 && payment.method === 'later' ? [{ label: 'Paid now', value: amount(0) }] : []),
];

/**
 * The 80mm thermal bill, headed by the logo, in black and white only, in the look the admin picked (Settings →
 * Documents: boxed, plain or framed; `look` overrides it for a preview). Each item is one line, its name cut short at a comma
 * (lib/shortName.js) and cut off with … if it is still too long, so a long catalogue name never runs onto more lines.
 * Hidden on screen; it is the only thing that prints. `screen` shows it instead (DocSamples.jsx, on Settings), and
 * `own` there stands in for the showroom's saved details (see useShopOnBill).
 */
export const ThermalReceipt = ({ sale, look: chosen, screen = false, own }) => {
  const { totals, payment } = sale;
  const look = useReceiptLook('thermalBill', chosen);
  const { shop, composition, gst, storeName, address, phone, gstin, title } = useShopOnBill(sale.location, own);
  const paid = paidLines(payment);
  return (
    <Slip look={look} screen={screen}>
      <SlipHead storeName={storeName} address={address} phone={phone} gstin={gstin} composition={composition} />

      <SlipTitle>{title}</SlipTitle>
      <SlipBox ruled={false}>
        <div className="mb-1 text-center text-[12px] font-bold">Bill No. {sale.billNo}</div>
        <Line label="Date" value={when.format(new Date(sale.at)).replace(',', '')} />
        <Line label="Showroom" value={shop.label} />
        {sale.name && <Line label="Customer" value={sale.name} />}
        {sale.phone && <Line label="Mobile" value={formatMobile(sale.phone)} />}
      </SlipBox>

      {/* each item on one line with its code and quantity, then a column row: MRP · discount · price · amount */}
      <SlipColumns className="grid grid-cols-4 gap-x-2">
        <span className="text-right">MRP</span>
        <span className="text-right">DISC</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">AMOUNT</span>
      </SlipColumns>
      <SlipItems>
        {sale.lines.map((l, i) => {
          // the catalogue's own offer discount, MRP → selling price
          const disc = l.mrp > l.price ? ((l.mrp - l.price) / l.mrp) * 100 : 0;
          return (
            <div key={l.code}>
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {i + 1}. {shortName(l.name)}
                </span>
                <span className="shrink-0 text-[10px]">
                  {l.code} ×{l.qty}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-x-2 tabular-nums">
                <span className="text-right">{amount(l.mrp)}</span>
                <span className="text-right">{disc > 0 ? `${Math.round(disc)}%` : '—'}</span>
                <span className="text-right">{amount(l.price)}</span>
                <span className="text-right font-semibold">{amount(l.price * l.qty)}</span>
              </div>
            </div>
          );
        })}
      </SlipItems>

      <SlipBox>
        <div>{countLabel(totals)}</div>
        <Line label="MRP total" value={amount(totals.mrpTotal)} />
        {totals.savings > 0 && <Line label="You saved" value={amount(totals.savings)} />}
        {totals.discount > 0 && (
          <Line label={`Discount${totals.discountKind === 'percent' ? ` (${totals.discountValue}%)` : ''}`} value={amount(-totals.discount)} />
        )}
        {Math.abs(totals.roundOff) >= 0.005 && <Line label="Round off" value={amount(totals.roundOff)} />}
      </SlipBox>

      <SlipTotal label="TOTAL" value={inr(totals.payable)} />

      {gst && (
        <SlipBox ruled={false}>
          <div className="font-bold">GST SUMMARY (incl. in price)</div>
          <Line label="Taxable value" value={amount(totals.taxable)} />
          {gstLines(totals.gstRows).map((g) => (
            <Line key={g.label} label={g.label} value={amount(g.value)} />
          ))}
        </SlipBox>
      )}

      {paid.length > 0 && (
        <SlipBox>
          {paid.map((p) => (
            <Line key={p.label} label={p.label} value={p.value} className={p.bold ? 'font-bold' : ''} />
          ))}
        </SlipBox>
      )}
      {payment.later > 0 && (
        <>
          <SlipTotal label="BALANCE DUE" value={inr(payment.later)} size="text-[13px]" />
          <div className="text-[10px]">Credit bill: please pay the balance at the showroom quoting this bill number.</div>
        </>
      )}

      {/* the fixed policy note, the same on every showroom's bill */}
      <SlipFoot>
        {BILL_FOOTER.map((f) => (
          <div key={f} className="font-bold">
            {f}
          </div>
        ))}
        {BRAND.email && <div>{BRAND.email}</div>}
      </SlipFoot>

      {/* a Christmas wish on every bill */}
      <SlipWish>{wishFor(sale.billNo)}</SlipWish>
    </Slip>
  );
};

/** The bill's items as the A4 page's table, in the page's look (it is drawn inside DocFrame, so it reads the look). */
const BillTable = ({ lines }) => {
  const t = useDocTable();
  return (
    <table className={t.table}>
      <thead>
        <tr className={t.head}>
          <th className={t.th}>S.No</th>
          <th className={t.th}>Code</th>
          <th className={`${t.th} text-left`}>Item</th>
          <th className={t.th}>Qty</th>
          <th className={`${t.th} text-right`}>MRP (₹)</th>
          <th className={t.th}>Disc</th>
          <th className={`${t.th} text-right`}>Price (₹)</th>
          <th className={`${t.th} text-right`}>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const disc = l.mrp > l.price ? ((l.mrp - l.price) / l.mrp) * 100 : 0;
          return (
            <tr key={l.code} className={t.row}>
              <td className={`${t.td} text-center`}>{i + 1}</td>
              <td className={`${t.td} text-center font-mono text-[10px] whitespace-nowrap`}>{l.code}</td>
              <td className={t.td}>{l.name}</td>
              <td className={`${t.td} text-center`}>{l.qty}</td>
              <td className={`${t.td} text-right`}>{amount(l.mrp)}</td>
              <td className={`${t.td} text-center`}>{disc > 0 ? `${Math.round(disc)}%` : '—'}</td>
              <td className={`${t.td} text-right`}>{amount(l.price)}</td>
              <td className={`${t.td} text-right`}>{amount(l.price * l.qty)}</td>
            </tr>
          );
        })}
        <tr className={t.total}>
          <td colSpan={3} className={`${t.td} text-right`}>
            Total
          </td>
          <td className={`${t.td} text-center`}>{lines.reduce((s, l) => s + l.qty, 0)}</td>
          <td colSpan={3} className={t.td} />
          <td className={`${t.td} text-right`}>{amount(lines.reduce((s, l) => s + l.price * l.qty, 0))}</td>
        </tr>
      </tbody>
    </table>
  );
};


/** How the A4 bill was paid, under the amount in words and boxed the way that box is in the page's look, so the two
 *  read as one column with their text lined up. */
const PaymentBox = ({ children }) => {
  const { look } = useDoc();
  const box = look === 'band' ? 'border-l-4 border-(--q-accent) px-3 py-2' : look === 'classic' ? 'border border-(--q-accent) px-3 py-2' : '';
  return <div className={`mt-2.5 ${box}`}>{children}</div>;
};

/**
 * The same bill on an A4 page (the paper chosen on the sale-complete dialog), laid out like every other A4 document
 * (DocParts.jsx, in the look picked under Settings → Documents) and in the colours picked for the showroom's
 * quotations (Evergreen unless another is picked; Black & white for a mono printer): the title on top, the showroom (no Raave's logo: the bill is the showroom's own), the customer and the
 * bill's details, the items, the totals with the payment beside them, and the policy note. `look` overrides the
 * admin's for a preview, `screen` shows it on screen instead of only in print, and `own` stands in for the showroom's
 * saved details (Settings).
 */
export const A4Bill = ({ sale, look, colour: chosen, screen = false, own }) => {
  const picked = useQuoteColour(); // a showroom's customer documents share their colours: the quotation's
  const colour = chosen ?? picked;
  const { totals, payment } = sale;
  const { shop, composition, gst, storeName, address, phone, gstin, title } = useShopOnBill(sale.location, own);
  const at = when.format(new Date(sale.at)).replace(',', '');
  const paid = paidLines(payment);
  return (
    <div data-receipt={screen ? undefined : true} data-paper={screen ? undefined : 'a4'} className={screen ? 'block bg-white' : 'hidden print:block'}>
      <DocFrame colour={colour} kind="bill" look={look}>
        <DocHead
          title={title}
          tag={composition ? 'Composition dealer' : undefined}
          number={sale.billNo}
          date={at}
          name={storeName}
          lines={address}
          contact={[phone && `Ph: ${phone}`, BRAND.email].filter(Boolean).join('  |  ')}
          taxLine={gstin ? `GSTIN: ${gstin}` : undefined}
        />

        <Parties>
          <PartyBox label="Billed to">
            <div className="text-[12px] font-bold">{sale.name || 'Walk-in customer'}</div>
            {sale.phone && <div>Mobile: {formatMobile(sale.phone)}</div>}
          </PartyBox>
          <PartyBox label="Bill details" tinted>
            <Meta label="Bill No." value={sale.billNo} />
            <Meta label="Date" value={at} />
            <Meta label="Showroom" value={shop.label} />
          </PartyBox>
        </Parties>

        <BillTable lines={sale.lines} />

        <DocSums
          words={inWords(totals.payable)}
          note={
            <PaymentBox>
              <Label>Payment</Label>
              {paid.map((p) => (
                <Meta key={p.label} label={p.label} value={p.value} />
              ))}
              {payment.later > 0 && (
                <>
                  <Meta label="Balance due" value={inr(payment.later)} />
                  <div className="mt-1 font-semibold">Credit bill: please pay the balance at the showroom quoting this bill number.</div>
                </>
              )}
              <div className="mt-1 text-black/65">
                {countLabel(totals)}
                {gst ? ' · prices include GST' : ''}
              </div>
            </PaymentBox>
          }
          rows={[
            ['MRP total', amount(totals.mrpTotal)],
            ...(totals.savings > 0 ? [['You saved', amount(totals.savings)]] : []),
            ...(totals.discount > 0 ? [[`Discount${totals.discountKind === 'percent' ? ` (${totals.discountValue}%)` : ''}`, amount(-totals.discount)]] : []),
            ...(Math.abs(totals.roundOff) >= 0.005 ? [['Round off', amount(totals.roundOff)]] : []),
            ...(gst ? [['Taxable value', amount(totals.taxable)], ...gstLines(totals.gstRows).map((g) => [g.label, amount(g.value)])] : []),
          ]}
          grand={['TOTAL (₹)', amount(totals.payable)]}
        />

        <SignOff forName={storeName} left={null} />

        {/* the fixed policy note and the bill's Christmas wish */}
        <div className="mt-6 flex flex-col items-center gap-0.5 text-center break-inside-avoid">
          {BILL_FOOTER.map((f) => (
            <div key={f} className="font-bold">
              {f}
            </div>
          ))}
          <div className="mt-2 font-display text-[13px] italic">{wishFor(sale.billNo)}</div>
        </div>
        <DocFoot>
          {storeName}
          {gstin ? ` · GSTIN ${gstin}` : ''}
          {BRAND.email ? ` · ${BRAND.email}` : ''}
        </DocFoot>
      </DocFrame>
    </div>
  );
};

/** The bill, on the paper chosen on the counter (80mm receipt or A4). */
const Receipt = ({ sale }) => (usePaper() === 'a4' ? <A4Bill sale={sale} /> : <ThermalReceipt sale={sale} />);

export default Receipt;
