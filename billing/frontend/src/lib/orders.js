/**
 * Purchase orders: how stock gets into a showroom. The server numbers them (PO-CHN-0007) and moves them on.
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

export const orderQty = (lines) => lines.reduce((s, l) => s + l.qty, 0);
export const orderValue = (lines) => lines.reduce((s, l) => s + l.qty * l.rate, 0);

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
