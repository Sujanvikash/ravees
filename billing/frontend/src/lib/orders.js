import { locationById } from '../config.js';
import { findProduct } from './catalogue.js';
import { stateOfGstin } from './gst.js';

/**
 * Purchase orders: a showroom's requests for stock. The server numbers them (PO-CHN-0007). The admin fulfils one
 * by raising an invoice for it; stock reaches the showroom through that invoice, not through the order.
 *
 *   requested  a showroom asked for stock; the admin reviews it
 *   fulfilled  the admin raised an invoice for it
 *   rejected   the admin turned the request down
 *   cancelled  the showroom withdrew its request
 *   sent, received  older orders, from when the admin sent stock on a purchase order (kept for the record)
 *
 *   order = { id, number, location, status, lines: [{ code, name, qty, rate }], note, source,
 *             counted: [{ code, qty }] | null, history: [{ at, by, action, note? }], createdAt, updatedAt }
 */
export const STATUS = {
  requested: { label: 'Requested', className: 'bg-warn-50 text-warn-ink' },
  fulfilled: { label: 'Fulfilled', className: 'bg-ok-50 text-ok-ink' },
  sent: { label: 'On the way', className: 'bg-evergreen-50 text-evergreen-900' },
  received: { label: 'Received', className: 'bg-mist text-ink-2' },
  rejected: { label: 'Rejected', className: 'bg-ruby-50 text-ruby-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ink-3' },
};

export const orderQty = (lines) => lines.reduce((s, l) => s + l.qty, 0);
/** The goods value at the purchase rate (the rate a showroom buys from the admin at). */
export const orderValue = (lines) => lines.reduce((s, l) => s + l.qty * l.rate, 0);

// Purchase orders carry GST at this rate on the purchase value (unlike customer bills, where the composition
// dealer's price already includes GST and none is shown). Purchase returns carry none: see returnSums.
export const PO_GST = 18;
export const orderGst = (lines) => (orderValue(lines) * PO_GST) / 100;
export const orderTotal = (lines) => orderValue(lines) + orderGst(lines);

/**
 * Purchase returns (stock a showroom sends back to the admin, PR-CHN-0002) are valued at the D.Rate (the cost price
 * the admin bills the showroom at) only: no GST and never the retail price. The server puts the rate on each line
 * when it is sent.
 *
 *   return = { id, number, location, status: sent | received, reason, note,
 *              lines: [{ code, name, hsn, qty, held, rate, amount }], counted: [{ code, qty }] | null,
 *              kept: [{ code, name, qty, rate, amount }] | null, issuer: { name, address, phone, gstin, state },
 *              subtotal, lrNo, vehicleNo, cartons, ewayNo, docName, hasDocument, history, createdAt, updatedAt }
 *   held: what the showroom had of the product when it sent it; kept (end of the season only): what it had and
 *   didn't send at all. Returns sent before 2026-11-12 have only { code, name, qty, rate } lines, and no issuer,
 *   held or kept.
 */
const paise = (n) => Math.round(n * 100) / 100;
const rateOf = (l) => l.rate ?? findProduct(l.code)?.cost ?? 0;

/** A return's lines with their value at D.Rate, and the value of the whole return: { lines, value }. */
export const returnSums = (r) => {
  const lines = r.lines.map((l) => ({ ...l, rate: rateOf(l), amount: l.amount ?? paise(l.qty * rateOf(l)) }));
  return { lines, value: paise(lines.reduce((s, l) => s + l.amount, 0)) };
};

/** The showroom as the return names it: what its Settings said when it was sent, the built-in details filling any
 *  gap (and all of it on a return sent before that). */
export const returnIssuer = (r) => {
  const shop = locationById(r.location) ?? {};
  const own = r.issuer ?? {};
  const gstin = (own.gstin || shop.gstin || '').toUpperCase();
  return {
    name: own.name || shop.name || (shop.label ? `${shop.label} showroom` : ''),
    lines: (own.address || (shop.address ?? []).join('\n')).split('\n').filter(Boolean),
    phone: own.phone || shop.phone || '',
    gstin,
    state: own.state || stateOfGstin(gstin) || shop.state || '',
  };
};

/** The lines of a return the showroom sent fewer of than it had, with how many it kept: [{ …line, short }]. Empty for
 *  a return sent before what it had was kept on it. */
export const shortLines = (r) => r.lines.filter((l) => l.held != null && l.held > l.qty).map((l) => ({ ...l, short: l.held - l.qty }));

/** Everything a showroom kept back on a return: its short lines and the products it didn't send at all. */
export const keptBack = (r) => {
  const short = shortLines(r);
  const kept = r.kept ?? [];
  return { short, kept, lines: short.length + kept.length, units: short.reduce((s, l) => s + l.short, 0) + orderQty(kept) };
};

/**
 * What the admin wants to know of a return, in units and in value at D.Rate:
 *   returned     what the showroom sent back
 *   notReturned  what it had and kept (sent fewer of, or didn't send at all; known on returns sent from 2026-11-12)
 *   arrived / missing  once counted in: what reached the admin, and what was sent but didn't arrive
 * and every product on it, with what it had, sent, kept and (once counted) what arrived:
 *   rows [{ code, name, rate, held, returned, notReturned, arrived }]
 */
export const returnTally = (r) => {
  const counted = r.counted ? new Map(r.counted.map((c) => [c.code, c.qty])) : null;
  const rows = [
    ...r.lines.map((l) => ({
      code: l.code,
      name: l.name,
      rate: rateOf(l),
      held: l.held ?? null,
      returned: l.qty,
      notReturned: l.held != null ? Math.max(l.held - l.qty, 0) : 0,
      arrived: counted ? (counted.get(l.code) ?? 0) : null,
    })),
    ...(r.kept ?? []).map((k) => ({ code: k.code, name: k.name, rate: rateOf(k), held: k.qty, returned: 0, notReturned: k.qty, arrived: null })),
  ];
  const sum = (pick) => {
    const units = rows.reduce((s, row) => s + pick(row), 0);
    return { units, value: paise(rows.reduce((s, row) => s + pick(row) * row.rate, 0)) };
  };
  return {
    rows,
    known: r.lines.some((l) => l.held != null),
    returned: sum((row) => row.returned),
    notReturned: sum((row) => row.notReturned),
    arrived: counted ? sum((row) => row.arrived ?? 0) : null,
    missing: counted ? sum((row) => (row.arrived == null ? 0 : Math.max(row.returned - row.arrived, 0))) : null,
  };
};

/** Units per product that are on their way to a showroom (sent, not yet counted in) or still requested. */
export const pendingByProduct = (orders, location, status) => {
  const out = {};
  for (const o of orders) {
    if (o.status !== status || (location && o.location !== location)) continue;
    for (const l of o.lines) out[l.code] = (out[l.code] ?? 0) + l.qty;
  }
  return out;
};

/** Units counted in per product (received orders). */
export const receivedByProduct = (orders, location) => {
  const out = {};
  for (const o of orders) {
    if (o.status !== 'received' || (location && o.location !== location)) continue;
    for (const l of o.counted ?? []) out[l.code] = (out[l.code] ?? 0) + l.qty;
  }
  return out;
};

/** How many requests the admin still has to review (a showroom has nothing to act on). */
export const ordersNeedingAction = (orders, session) =>
  session.role === 'admin' ? orders.filter((o) => o.status === 'requested').length : 0;
