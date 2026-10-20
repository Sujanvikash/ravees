import { LOCATIONS } from '../config.js';

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

/** Totals for a set of sales. */
export const summarize = (sales) => {
  let total = 0;
  let taxable = 0;
  let tax = 0;
  let cost = 0;
  let units = 0;
  let savings = 0;
  for (const s of sales) {
    total += s.totals.payable;
    taxable += s.totals.taxable;
    tax += s.totals.tax;
    savings += s.totals.savings;
    units += s.totals.qty;
    cost += saleCost(s);
  }
  const profit = taxable - cost;
  return {
    total,
    taxable,
    tax,
    cost,
    profit,
    margin: taxable ? profit / taxable : 0,
    bills: sales.length,
    units,
    savings,
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
export const topProducts = (sales, limit = 8) => {
  const map = new Map();
  for (const s of sales) {
    // Share the bill's GST-free ratio across its lines, so line profit adds up to the bill's.
    const ratio = s.totals.payable ? s.totals.taxable / s.totals.payable : 1;
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
