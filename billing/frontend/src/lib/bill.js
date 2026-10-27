import { PRICES_INCLUDE_GST } from '../config.js';
import { findProduct } from './catalogue.js';

/** What a product sells for: its offer price when it has one, else MRP. */
export const priceOf = (product) => product.offer || product.mrp;

/**
 * Bill items ({ code, qty }) → lines with their product and amounts, plus the totals: MRP total, offer
 * savings, taxable value and GST per rate (split into CGST + SGST), round-off and the amount payable.
 * Items whose code is no longer in the product list are dropped.
 */
export const buildBill = (items) => {
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

  const gstRows = [...byRate.values()].sort((a, b) => b.rate - a.rate);
  const taxable = gstRows.reduce((sum, r) => sum + r.taxable, 0);
  const tax = gstRows.reduce((sum, r) => sum + r.tax, 0);
  const exact = PRICES_INCLUDE_GST ? gross : gross + tax;
  const payable = Math.round(exact);

  return {
    lines,
    count: lines.length,
    qty,
    mrpTotal,
    savings: mrpTotal - gross,
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
  const start = `${prefix}/${financialYear(date)}/`;
  let max = 0;
  for (const s of sales) if (s.billNo.startsWith(start)) max = Math.max(max, Number(s.billNo.slice(start.length)) || 0);
  return max + 1;
};

/** CHN/26-27/00184: the showroom's prefix, the financial year and its running number. */
export const billNumber = (prefix, seq, date) => `${prefix}/${financialYear(date)}/${String(seq).padStart(5, '0')}`;
