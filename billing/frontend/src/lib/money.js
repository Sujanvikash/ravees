const twoDecimals = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

// Rounds to paise first so float noise never shows as "−₹0.00".
const paise = (n) => Math.round(n * 100) / 100 || 0;

/** 31640 → "31,640.00" (Indian digit grouping). */
export const amount = (n) => twoDecimals.format(paise(n));

/** 31640 → "₹31,640.00"; negatives get a real minus sign. */
export const inr = (n) => {
  const v = paise(n);
  return v < 0 ? `−₹${twoDecimals.format(-v)}` : `₹${twoDecimals.format(v)}`;
};

/** 32000 → "₹32,000", for quick-cash buttons and day totals. */
export const inrWhole = (n) => `₹${whole.format(n)}`;

/** Short Indian form for chart axes: ₹1.2Cr, ₹10L, ₹50k, ₹800. */
export const inrShort = (n) => {
  const trim = (v) => String(Number(v.toFixed(1)));
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
};

/** "32,000" or "₹ 32000.50" typed by staff → 32000.5; anything unreadable → 0. */
export const parseAmount = (text) => Number(String(text).replace(/[^\d.]/g, '')) || 0;
