/**
 * Transfer invoices: the admin's bills to a showroom for boxes from the warehouse, at cost price plus 18% on every
 * product. The server numbers them and moves them on.
 *
 *   raised     made; the e-way bill or bill from the GST portal is recorded on it
 *   paid       the admin marked it paid (needs a recorded e-way bill or bill number)
 *   stocked    the admin added its products to the showroom's stock
 *   cancelled  withdrawn before it was added; its boxes went back to the warehouse
 *
 *   invoice = { id, number, location, status, lines: [{ code, name, qty, cost, rate, amount }], markupPct, subtotal,
 *               total, ewayNo, billNo, docName, hasDocument, paidAt, paidRef, orderId, boxIds,
 *               history: [{ at, by, action, note? }], createdAt, updatedAt }
 */
export const MARKUP_PCT = 18;

export const STATUS = {
  raised: { label: 'Raised', className: 'bg-warn-50 text-warn-ink' },
  paid: { label: 'Paid', className: 'bg-evergreen-50 text-evergreen-900' },
  stocked: { label: 'Added to store', className: 'bg-ok-50 text-ok-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ink-3' },
};

/** The rate a showroom pays: cost plus the markup, to the paisa (the server works it out the same way). */
export const rateOf = (cost) => Math.round(cost * (100 + MARKUP_PCT)) / 100;
