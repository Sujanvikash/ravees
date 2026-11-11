import { locationById } from '../config.js';
import { api } from './api.js';
import { stateOfGstin } from './gst.js';

/**
 * Invoices: the admin's bills to a showroom for boxes and single products from the admin stock, each product at its
 * cost price (D.Rate) with its GST (18%) on top; nothing else is added. The retail price and discount are only for
 * customers. The server numbers the invoices and moves them on.
 *
 *   raised     made; the e-way bill or bill from the GST portal is recorded on it
 *   paid       the admin marked it paid (needs a recorded e-way bill or bill number)
 *   stocked    the admin added its products to the showroom's stock
 *   cancelled  withdrawn before it was added; its products went back to the admin stock
 *
 *   invoice = { id, number, location, status, lines: [{ code, name, qty, cost, rate, amount, gst, tax }], markupPct,
 *               subtotal, total, ewayNo, billNo, docName, hasDocument, paidAt, paidRef, orderId, boxIds,
 *               history: [{ at, by, action, note? }], createdAt, updatedAt }
 *   rate = cost, amount = rate × qty (the taxable value), tax = amount × gst%, total = subtotal + the tax. Invoices
 *   raised before this have markupPct 18 (rate = cost + 18%) and no gst or tax on their lines.
 *   buyer = { name, address, phone, gstin, state } is the showroom as printed; interState is true when its state
 *   isn't Tamil Nadu (IGST, else CGST + SGST). Both are null on invoices raised before 2026-11-10.
 */

export const STATUS = {
  raised: { label: 'Raised', className: 'bg-warn-50 text-warn-ink' },
  paid: { label: 'Paid', className: 'bg-evergreen-50 text-evergreen-900' },
  stocked: { label: 'Added to store', className: 'bg-ok-50 text-ok-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-mist text-ink-3' },
};

/** An invoice line for `qty` of a product, to the paisa, the same way the server works it out: its cost price
 *  (D.Rate) as the rate, and its GST (18% unless the product says otherwise) on top. */
export const invoiceLine = ({ code, name, qty }, product) => {
  const rate = product?.cost ?? 0;
  const amount = Math.round(qty * rate * 100) / 100;
  const gst = product?.gst ?? 18;
  return { code, name, qty, cost: rate, rate, amount, gst, tax: Math.round(amount * gst) / 100 };
};

/** A showroom as an invoice names it, from its own Settings (Shop on the bill), with the built-in details filling
 *  any gap: { name, address, phone, gstin, state }. The state is its GSTIN's, else where the store is. */
export const storeBuyer = async (location) => {
  const shop = locationById(location) ?? {};
  const own = await api(`/settings?location=${encodeURIComponent(location)}`).catch(() => ({}));
  const gstin = (own.gstin?.trim() || shop.gstin || '').toUpperCase();
  return {
    name: own.storeName?.trim() || shop.name || (shop.label ? `${shop.label} showroom` : ''),
    address: own.storeAddress?.trim() || (shop.address ?? []).join('\n'),
    phone: own.storePhone?.trim() || shop.phone || '',
    gstin,
    state: stateOfGstin(gstin) || shop.state || '',
  };
};
