import { LOCATIONS } from '../config.js';
import { findProduct } from './catalogue.js';

/**
 * Figures for the sales screens and the admin dashboard, all computed from the saved sales.
 *
 * Purchase cost is the product's cost price (the old system's D.Rate) times the quantity, captured on
 * each bill line when it was sold. Gross profit compares it with the taxable value (sales without GST),
 * on the assumption that the cost price is also without GST.
 */

export const PERIODS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: 'all', label: 'All time', days: null },
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The first day a period covers ("7 days" = today and the six days before it), or null for all time. */
export const periodStart = (periodId, now = new Date()) => {
  const days = PERIODS.find((p) => p.id === periodId)?.days;
  if (!days) return null;
  const d = startOfDay(now);
  d.setDate(d.getDate() - (days - 1));
  return d;
};

/** Sales of one showroom (or all, when location is null) since a period's first day. */
export const filterSales = (sales, { location = null, period = 'all', now = new Date() } = {}) => {
  const from = periodStart(period, now);
  return sales.filter((s) => (!location || s.location === location) && (!from || new Date(s.at) >= from));
};

export const saleCost = (sale) => sale.lines.reduce((sum, l) => sum + (l.cost ?? 0) * l.qty, 0);

/** What has come back against each bill, keyed by the bill's id:
 *  { qty, amount, refund, byCode: { [code]: qty }, exchanged, exchangeBills: [billNo], notes: [{…}] }.
 *  Both returns and exchanges count, since in each case the goods leave the original bill. */
export const returnsBySale = (returns) => {
  const map = new Map();
  for (const r of returns) {
    const row = map.get(r.saleId) ?? { qty: 0, amount: 0, refund: 0, byCode: {}, exchanged: false, exchangeBills: [], notes: [] };
    row.amount += r.amount;
    row.refund += r.refund ?? 0;
    row.notes.push(r);
    if (r.kind === 'exchange') {
      row.exchanged = true;
      if (r.exchangeBillNo) row.exchangeBills.push(r.exchangeBillNo);
    }
    for (const l of r.lines) {
      row.qty += l.qty;
      row.byCode[l.code] = (row.byCode[l.code] ?? 0) + l.qty;
    }
    map.set(r.saleId, row);
  }
  return map;
};

/** The one-word state of a bill, given what has come back against it (its returnsBySale row, or undefined):
 *  'exchanged' (any exchange), 'returned' (all units back), 'part' (some back), or 'none'. */
export const returnStatus = (row, soldQty) => {
  if (!row || row.qty === 0) return 'none';
  if (row.exchanged) return 'exchanged';
  return row.qty >= soldQty ? 'returned' : 'part';
};

/** Each showroom's returns for a period: [{ location, amount, count }] in LOCATIONS order. */
export const returnsByLocation = (returns, { period = 'all', now = new Date() } = {}) =>
  LOCATIONS.map((l) => {
    const rs = filterSales(returns, { location: l.id, period, now });
    return { location: l, amount: rs.reduce((s, r) => s + r.amount, 0), count: rs.length };
  });

/** Totals for a set of sales. With gst false (the admin's Show GST switch off), profit and margin are on the
 *  selling price rather than on the value without GST. */
export const summarize = (sales, { gst = true } = {}) => {
  let total = 0;
  let taxable = 0;
  let tax = 0;
  let cost = 0;
  let units = 0;
  let savings = 0;
  let discount = 0;
  for (const s of sales) {
    total += s.totals.payable;
    taxable += s.totals.taxable;
    tax += s.totals.tax;
    savings += s.totals.savings;
    discount += s.totals.discount ?? 0;
    units += s.totals.qty;
    cost += saleCost(s);
  }
  const base = gst ? taxable : total;
  const profit = base - cost;
  return {
    total,
    taxable,
    tax,
    cost,
    profit,
    margin: base ? profit / base : 0,
    bills: sales.length,
    units,
    savings,
    discount,
    average: sales.length ? total / sales.length : 0,
  };
};

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Sales total for each of the last `days` days, oldest first (days with no sales are 0). */
export const salesByDay = (sales, days, now = new Date()) => {
  const totals = new Map();
  for (const s of sales) {
    const k = dayKey(new Date(s.at));
    totals.set(k, (totals.get(k) ?? 0) + s.totals.payable);
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(now);
    d.setDate(d.getDate() - i);
    out.push({ date: d, total: totals.get(dayKey(d)) ?? 0 });
  }
  return out;
};

/** Each showroom's totals, in the order of LOCATIONS. */
export const byLocation = (sales) =>
  LOCATIONS.map((l) => ({ location: l, ...summarize(sales.filter((s) => s.location === l.id)) }));

/** Products ranked by sales value: units, sales (incl. GST), cost and profit. */
export const topProducts = (sales, limit = 8, { gst = true } = {}) => {
  const map = new Map();
  for (const s of sales) {
    // Share the bill's GST-free ratio across its lines, so line profit adds up to the bill's.
    const ratio = gst && s.totals.payable ? s.totals.taxable / s.totals.payable : 1;
    for (const l of s.lines) {
      const row = map.get(l.code) ?? { code: l.code, name: l.name, units: 0, total: 0, cost: 0, taxable: 0 };
      row.units += l.qty;
      row.total += l.price * l.qty;
      row.taxable += l.price * l.qty * ratio;
      row.cost += (l.cost ?? 0) * l.qty;
      map.set(l.code, row);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, profit: r.taxable - r.cost }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

/** Takings per payment method. A split bill counts its cash part as Cash and the rest as UPI / card. */
export const byMethod = (sales) => {
  const out = { cash: 0, upi: 0, card: 0, split: 0 };
  for (const s of sales) {
    if (s.payment.method === 'split' && s.payment.split) {
      out.cash += s.payment.split.cash;
      out.split += s.payment.split.upi;
    } else {
      out[s.payment.method] = (out[s.payment.method] ?? 0) + s.totals.payable;
    }
  }
  return out;
};

/**
 * How each product is doing, season to date: units sold (less what customers brought back) and units still in
 * stock, for one showroom or all of them. Only products that have stock or have sold are listed.
 * → [{ code, name, sold, left, share }] with share = sold / (sold + left).
 */
export const productSellThrough = (sales, returns, stock, location = null) => {
  const rows = new Map();
  const row = (code, name) => {
    if (!rows.has(code)) rows.set(code, { code, name: name ?? findProduct(code)?.name ?? code, sold: 0, left: 0 });
    return rows.get(code);
  };
  for (const s of sales) if (!location || s.location === location) for (const l of s.lines) row(l.code, l.name).sold += l.qty;
  for (const r of returns) if (!location || r.location === location) for (const l of r.lines) row(l.code, l.name).sold -= l.qty;
  for (const [shop, codes] of Object.entries(stock)) {
    if (location && shop !== location) continue;
    for (const [code, qty] of Object.entries(codes)) if (qty > 0) row(code).left += qty;
  }
  return [...rows.values()]
    .map((r) => ({ ...r, sold: Math.max(r.sold, 0) }))
    .filter((r) => r.sold + r.left > 0)
    .map((r) => ({ ...r, share: r.sold / (r.sold + r.left) }));
};
