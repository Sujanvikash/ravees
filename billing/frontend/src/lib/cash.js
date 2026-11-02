import { inr } from './money.js';

/** "₹150 short" / "₹50 over" / "Balanced", for a cash close's difference (counted − expected). */
export const differenceLabel = (d) => (Math.abs(d) < 0.5 ? 'Balanced' : d < 0 ? `${inr(-d)} short` : `${inr(d)} over`);
export const differenceTone = (d) => (Math.abs(d) < 0.5 ? 'text-ok-ink' : d < 0 ? 'text-ruby-ink' : 'text-warn-ink');

/** Cash a sale put in the drawer: cash handed over less change, or the cash part of a split (as the server's
 *  cash close counts it). */
export const cashIn = (payment) =>
  payment.method === 'cash' ? payment.received - payment.change : payment.method === 'split' ? (payment.split?.cash ?? 0) : 0;
