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

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const below100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const below1000 = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', below100(n % 100)].filter(Boolean).join(' ');

/** 12345.5 → "Twelve Thousand Three Hundred Forty Five Rupees and Fifty Paise Only" (Indian crore / lakh grouping). */
export const inWords = (n) => {
  const total = Math.round(Math.abs(n) * 100);
  const rupees = Math.floor(total / 100);
  const paise = total % 100;
  const parts = [
    [Math.floor(rupees / 1e7), 'Crore'],
    [Math.floor(rupees / 1e5) % 100, 'Lakh'],
    [Math.floor(rupees / 1e3) % 100, 'Thousand'],
  ]
    .filter(([count]) => count)
    .map(([count, name]) => `${below100(count)} ${name}`);
  if (rupees % 1000) parts.push(below1000(rupees % 1000));
  const words = `${parts.join(' ') || 'Zero'} Rupees`;
  return `${words}${paise ? ` and ${below100(paise)} Paise` : ''} Only`;
};

/** "32,000" or "₹ 32000.50" typed by staff → 32000.5; anything unreadable → 0. */
export const parseAmount = (text) => Number(String(text).replace(/[^\d.]/g, '')) || 0;
