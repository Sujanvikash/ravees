// Wording and badge colours shared by the admin's pages (enquiries and orders, on their lists and the overview).
// Every badge's text reads at WCAG AA on its own tint in the admin's palette (index.css, `.admin-ui`).

export const ENQUIRY_TYPES = {
  'quote-request': 'Quote request', // the old checkout's, before everything could be paid for online
  consult: 'Consultation',
  contact: 'Contact',
  product: 'Product enquiry',
};

export const ENQUIRY_STATUSES = ['new', 'contacted', 'closed'];

export const ENQUIRY_STATUS_STYLE = {
  new: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  contacted: 'bg-gold-400/15 text-gold-300 border-gold-400/30',
  closed: 'bg-contrast/8 text-text-secondary border-contrast/10',
};

// Order statuses as badges. The account pages have their own (lib/orders.js); the admin's are told apart at a
// glance in a long list: shipped in solid evergreen, the rest as tints.
const ORDER_BADGE = {
  pending: 'border-gold-400/30 bg-gold-400/10 text-gold-300',
  paid: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  shipped: 'border-forest bg-forest text-cream-50',
  delivered: 'border-contrast/15 bg-contrast/8 text-text-secondary',
  cancelled: 'border-ruby-500/40 bg-ruby-500/10 text-ruby-500',
};

/** Classes for an order's status as a small rounded badge. */
export const orderBadgeClass = (status) =>
  `inline-block rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.06em] ${ORDER_BADGE[status] ?? ORDER_BADGE.delivered}`;
