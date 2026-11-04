import { Banknote, CreditCard, QrCode, Split } from 'lucide-react';

export const METHODS = [
  { id: 'cash', label: 'Cash', Icon: Banknote },
  { id: 'upi', label: 'UPI', Icon: QrCode },
  { id: 'card', label: 'Card', Icon: CreditCard },
  { id: 'split', label: 'Split', Icon: Split },
];

// Methods the server writes on a bill that the counter never picks: an exchange the credit covered in full, and
// a credit bill with nothing paid at the counter.
const OTHER_LABELS = { credit: 'Exchange credit', later: 'On credit' };

export const methodLabel = (id) => METHODS.find((m) => m.id === id)?.label ?? OTHER_LABELS[id] ?? id;

/**
 * Credit bills: the customer pays part (or none) of a bill at the counter and the rest later. payment.later is
 * what was left owing when the bill was made; sale.balance is what is still owed now (it comes down with each
 * payment in sale.collections, and with goods returned against the bill).
 */
export const isCreditBill = (sale) => (sale.payment?.later ?? 0) > 0;

/** What the customer paid on the bill at the counter: the amount due less any exchange credit and what was left owing. */
export const paidAtCounter = (sale) => Math.max(sale.totals.payable - (sale.payment.credit ?? 0) - (sale.payment.later ?? 0), 0);

/** Everything paid towards the bill so far: at the counter and every collection since. */
export const paidSoFar = (sale) => paidAtCounter(sale) + (sale.collections ?? []).reduce((t, c) => t + c.amount, 0);

/** Whole days since a date (0 = today). */
export const daysSince = (at, now = new Date()) => Math.max(Math.floor((now - new Date(at)) / 86_400_000), 0);

/** The age bands the credit screens group what is owed into. */
export const AGE_BANDS = [
  { id: 'week', label: 'Up to 7 days', max: 7 },
  { id: 'month', label: '8–30 days', max: 30 },
  { id: 'two', label: '31–60 days', max: 60 },
  { id: 'old', label: 'Over 60 days', max: Infinity },
];
export const ageBand = (days) => AGE_BANDS.find((b) => days <= b.max);

/** Cash, UPI and card a payment (a bill's or a collection's) brought in. */
export const takings = (payment) => {
  if (payment.method === 'split' && payment.split) {
    return { cash: payment.split.cash ?? 0, upi: payment.split.upi ?? 0, card: payment.split.card ?? 0 };
  }
  const got = payment.method === 'cash' ? (payment.received ?? 0) - (payment.change ?? 0) : (payment.received ?? 0);
  return { cash: 0, upi: 0, card: 0, ...(['cash', 'upi', 'card'].includes(payment.method) ? { [payment.method]: got } : {}) };
};

/** Credit bills still owed more than 30 days after the bill: the menu's badge on Credit bills. */
export const overdueCredit = (sales, now = new Date()) => sales.filter((s) => s.balance > 0 && daysSince(s.at, now) > 30).length;
