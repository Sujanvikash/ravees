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

/**
 * Bill items ({ code, qty }) → lines with their product and amounts, plus the totals: MRP total, offer
 * savings, the selling subtotal (gross), taxable value and GST per rate (split into CGST + SGST), round-off and
 * the amount payable. Items whose code is no longer in the product list are dropped. A manual `discount` comes off
 * the selling subtotal, held to `cap` percent of it (capDiscount), and is spread across the GST rates in
 * proportion, so the taxable value and GST drop with it.
 */
export const buildBill = (items, discount = null, cap = 100) => {
  const lines = items
    .map((item) => ({ ...item, product: findProduct(item.code) }))
    .filter((line) => line.product)
    .map((line) => {
      const price = priceOf(line.product);
      return { ...line, price, amount: price * line.qty, mrpAmount: line.product.mrp * line.qty };
    });

  const byRate = new Map();
  let gross = 0;
  let mrpTotal = 0;
  let qty = 0;
  for (const line of lines) {
    gross += line.amount;
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
    savings: mrpTotal - gross,
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
