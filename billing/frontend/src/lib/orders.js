import { locationById } from '../config.js';

/**
 * Purchase orders: how stock gets into a showroom.
 *
 *   requested  a showroom asked for stock; the admin reviews it (edits quantities, rates, items)
 *   sent       the admin sent it to the showroom; the showroom counts the goods in when they arrive
 *   received   counted in: the counted quantities were added to the showroom's stock
 *   rejected   the admin turned the request down
 *   cancelled  the showroom withdrew its request before the admin sent it
 *
 *   order = { id, number, location, status, lines: [{ code, name, qty, rate }], note, source,
 *             counted: [{ code, qty }] | null, history: [{ at, by, action, note? }], createdAt, updatedAt }
 */
export const STATUS = {
  requested: { label: 'Requested', className: 'bg-warn-50 text-warn-ink' },
  sent: { label: 'On the way', className: 'bg-evergreen-50 text-evergreen-900' },
  received: { label: 'Received', className: 'bg-mist text-ink-2' },
  rejected: { label: 'Rejected', className: 'bg-ruby-50 text-ruby-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ink-3' },
};

/** PO-CHN-0007: the showroom's prefix and its running order count. */
export const nextOrderNumber = (orders, location) => {
  const n = orders.filter((o) => o.location === location).length + 1;
  return `PO-${locationById(location).billPrefix}-${String(n).padStart(4, '0')}`;
};

/** A new, empty order for a showroom, numbered after its existing ones. */
export const newOrder = (orders, location) => ({
  id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  number: nextOrderNumber(orders, location),
  location,
  createdAt: new Date().toISOString(),
  history: [],
  counted: null,
});

export const orderQty = (lines) => lines.reduce((s, l) => s + l.qty, 0);
export const orderValue = (lines) => lines.reduce((s, l) => s + l.qty * l.rate, 0);

/** Adds an entry to an order's history, stamped now. */
export const withHistory = (order, by, action, note) => ({
  ...order,
  updatedAt: new Date().toISOString(),
  history: [...(order.history ?? []), { at: new Date().toISOString(), by, action, ...(note ? { note } : {}) }],
});

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

/** How many orders need this login's attention: requests to review (admin) or deliveries to count in (showroom). */
export const ordersNeedingAction = (orders, session) =>
  session.role === 'admin'
    ? orders.filter((o) => o.status === 'requested').length
    : orders.filter((o) => o.status === 'sent' && o.location === session.location).length;
