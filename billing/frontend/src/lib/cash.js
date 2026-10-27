import { inr } from './money.js';

/** "₹150 short" / "₹50 over" / "Balanced", for a cash close's difference (counted − expected). */
export const differenceLabel = (d) => (Math.abs(d) < 0.5 ? 'Balanced' : d < 0 ? `${inr(-d)} short` : `${inr(d)} over`);
export const differenceTone = (d) => (Math.abs(d) < 0.5 ? 'text-ok-ink' : d < 0 ? 'text-ruby-ink' : 'text-warn-ink');
