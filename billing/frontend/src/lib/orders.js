/**
 * Purchase orders: a showroom's requests for stock. The server numbers them (PO-CHN-0007). The admin fulfils one
 * by raising a transfer invoice for it; stock reaches the showroom through that invoice, not through the order.
 *
 *   requested  a showroom asked for stock; the admin reviews it
 *   fulfilled  the admin raised a transfer invoice for it
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

// Purchase orders and purchase returns carry GST at this rate on the purchase value (unlike customer bills,
// where the composition dealer's price already includes GST and none is shown).
export const PO_GST = 18;
export const orderGst = (lines) => (orderValue(lines) * PO_GST) / 100;
export const orderTotal = (lines) => orderValue(lines) + orderGst(lines);

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
