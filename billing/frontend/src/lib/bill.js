import { PRICES_INCLUDE_GST } from '../config.js';
import { findProduct } from './catalogue.js';

/** What a product sells for: its offer price when it has one, else MRP. */
export const priceOf = (product) => product.offer || product.mrp;

/** The most a manual discount may take off a bill of `gross` (GST-inclusive) at `cap` percent (the admin's limit,
 *  Settings → maxDiscountPct), in rupees rounded down to the paisa. */
export const maxDiscount = (gross, cap) => Math.floor(gross * cap + 1e-6) / 100;

/** A manual discount held to the limit: a percentage to `cap`, a flat amount to `cap` percent of `gross`; null when
 *  the limit is 0, the same discount back when it is within it. A flat amount isn't held while the bill is empty
 *  (nothing to measure it against yet). */
export const capDiscount = (discount, gross, cap = 100) => {
  if (!discount || !(discount.value > 0)) return discount;
  if (discount.kind === 'percent') return discount.value > cap ? (cap > 0 ? { ...discount, value: cap } : null) : discount;
  if (!(gross > 0) || cap >= 100) return discount;
  const most = maxDiscount(gross, cap);
  return discount.value > most ? (most > 0 ? { ...discount, value: most } : null) : discount;
};

/** The rupee amount a manual discount ({ kind: 'percent' | 'amount', value }) takes off a GST-inclusive
 *  subtotal. A percentage is capped at 100%, a flat amount at the whole subtotal (mirrors sales/bill.py), and
 *  both at `cap` percent of it when a lower limit is given. */
export const discountOff = (gross, discount, cap = 100) => {
  if (!discount || !(discount.value > 0)) return 0;
  if (discount.kind === 'percent') return (gross * Math.min(discount.value, cap, 100)) / 100;
  return Math.min(discount.value, cap >= 100 ? gross : maxDiscount(gross, cap));
};

/** What a saved bill's line came to: price × qty, less the discount on that line alone (`off`, in rupees). */
export const lineAmount = (line) => line.price * line.qty - (line.off ?? 0);

/** The rupees a manual discount on one line takes off its amount `listed`: any amount (no limit, unlike the whole
 *  bill's), held only to the line itself so it never goes below nothing, to the paisa as the server works it out. */
export const lineOff = (listed, discount) => Math.round(discountOff(listed, discount) * 100) / 100;

/** A bill line's product: the catalogue's, or for a line of a bill being edited (`sold`: the line as it was billed)
 *  the price, MRP and GST it was billed at, which an edit keeps (the server does the same). */
const productFor = (code, sold) => {
  const product = findProduct(code);
  if (!sold) return product;
  return { dept: '', ...product, code: sold.code, name: sold.name, mrp: sold.mrp, offer: sold.price < sold.mrp ? sold.price : 0, cost: sold.cost, gst: sold.gst };
};

/**
 * Bill items ({ code, qty, discount? }) → lines with their product and amounts, plus the totals: MRP total, offer
 * savings, the lines' own discounts (itemDiscount), the selling subtotal (gross), taxable value and GST per rate
 * (split into CGST + SGST), round-off and the amount payable. Items whose code is no longer in the product list are
 * dropped. An item's `discount` ({ kind, value }) comes off that line alone, with no limit but the line's own
 * amount. Then a manual whole-bill `discount` comes off the selling subtotal, held to `cap` percent of it
 * (capDiscount), and is spread across the GST rates in proportion, so the taxable value and GST drop with it.
 * `sold` (code → the line as billed) keeps the prices of a bill being edited.
 */
export const buildBill = (items, discount = null, cap = 100, sold = null) => {
  const lines = items
    .map((item) => ({ ...item, product: productFor(item.code, sold?.[item.code]) }))
    .filter((line) => line.product)
    .map((line) => {
      const price = sold?.[line.code] ? sold[line.code].price : priceOf(line.product);
      const listed = price * line.qty;
      const off = lineOff(listed, line.discount);
      return { ...line, price, listed, off, amount: listed - off, mrpAmount: line.product.mrp * line.qty };
    });

  const byRate = new Map();
  let gross = 0;
  let listed = 0;
  let itemDiscount = 0;
  let mrpTotal = 0;
  let qty = 0;
  for (const line of lines) {
    gross += line.amount;
    listed += line.listed;
    itemDiscount += line.off;
    mrpTotal += line.mrpAmount;
    qty += line.qty;
    const rate = line.product.gst;
    const taxable = PRICES_INCLUDE_GST ? line.amount / (1 + rate / 100) : line.amount;
    const row = byRate.get(rate) ?? { rate, taxable: 0, tax: 0 };
    row.taxable += taxable;
    row.tax += PRICES_INCLUDE_GST ? line.amount - taxable : (line.amount * rate) / 100;
    byRate.set(rate, row);
  }

  const held = capDiscount(discount, gross, cap);
  const off = discountOff(gross, held, cap);
  const factor = gross > 0 ? (gross - off) / gross : 1;
  const gstRows = [...byRate.values()]
    .map((r) => ({ rate: r.rate, taxable: r.taxable * factor, tax: r.tax * factor }))
    .sort((a, b) => b.rate - a.rate);
  const taxable = gstRows.reduce((sum, r) => sum + r.taxable, 0);
  const tax = gstRows.reduce((sum, r) => sum + r.tax, 0);
  const net = gross - off;
  const exact = PRICES_INCLUDE_GST ? net : net + tax;
  const payable = Math.round(exact);

  return {
    lines,
    count: lines.length,
    qty,
    mrpTotal,
    savings: mrpTotal - listed,
    itemDiscount,
    gross,
    discount: off,
    discountKind: off > 0 ? held.kind : null,
    discountValue: off > 0 ? held.value : 0,
    taxable,
    tax,
    gstRows,
    roundOff: payable - exact,
    payable,
  };
};

/** GST rows for the summary and receipt: each rate splits into CGST + SGST at half the rate. */
export const gstLines = (gstRows) =>
  gstRows
    .filter((r) => r.rate > 0)
    .flatMap((r) => [
      { label: `CGST ${r.rate / 2}%`, value: r.tax / 2 },
      { label: `SGST ${r.rate / 2}%`, value: r.tax / 2 },
    ]);

/** "5 items · 15 qty" */
export const countLabel = ({ count, qty }) => `${count} ${count === 1 ? 'item' : 'items'} · ${qty} qty`;

/** The Indian financial year (April to March) a date falls in, as "26-27". */
const financialYear = (date) => {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
};

/** The next running number for a showroom's bills this financial year, after the highest one in `sales` (the
 *  server hands out the real one when the bill is saved). */
export const nextSeq = (sales, prefix, date) => {
  const start = `${prefix}${financialYear(date).replace('-', '')}`;
  let max = 0;
  for (const s of sales) if (s.billNo.startsWith(start)) max = Math.max(max, Number(s.billNo.slice(start.length)) || 0);
  return max + 1;
};

/** CHN262700184: the showroom's prefix, the financial year (2627) and its running number — letters and digits
 *  only, no separators. The year keeps it unique across financial years (the sequence resets each). */
export const billNumber = (prefix, seq, date) => `${prefix}${financialYear(date).replace('-', '')}${String(seq).padStart(5, '0')}`;
