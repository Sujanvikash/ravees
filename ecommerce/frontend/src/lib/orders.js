/**
 * Order statuses, shared by the customer's account and the admin. An order is `pending` (waiting for
 * payment), then `paid` → `shipped` → `delivered`; or `cancelled`.
 */
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

const STATUS = {
  pending: { label: 'Awaiting payment', badge: 'border-gold-400/30 bg-gold-400/10 text-gold-300' },
  paid: { label: 'Paid', badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
  shipped: { label: 'Shipped', badge: 'border-forest bg-forest text-cream-50' },
  delivered: { label: 'Delivered', badge: 'border-contrast/10 bg-contrast/8 text-text-secondary' },
  cancelled: { label: 'Cancelled', badge: 'border-danger/40 bg-danger/10 text-danger' },
};

/** The status's wording ("Awaiting payment"). */
export const statusLabel = (status) => STATUS[status]?.label ?? status;

/** Classes for the status as a small rounded badge. */
export const statusBadgeClass = (status) =>
  `inline-block rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.06em] ${STATUS[status]?.badge ?? STATUS.delivered.badge}`;

/** The order's lines in a few words: "French Pine Christmas Tree × 1, Cluster light-1 × 2 and 3 more". */
export const linesSummary = (lines = [], shown = 2) => {
  const names = lines.slice(0, shown).map((line) => `${line.name} × ${line.qty}`);
  const more = lines.length - shown;
  return more > 0 ? `${names.join(', ')} and ${more} more` : names.join(', ');
};

/** The delivery address as lines of text (empty parts left out). */
export const addressLines = (address = {}) =>
  [address.name, address.line1, address.line2, [address.city, address.state].filter(Boolean).join(', '), address.pincode, address.phone]
    .filter(Boolean);
