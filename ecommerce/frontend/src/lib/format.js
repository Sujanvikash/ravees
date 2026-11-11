// Money and dates the Indian way, for the storefront and the admin alike.

const WHOLE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const PAISE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/** Rupees as "₹12,500" (Indian grouping: 125000 → "₹1,25,000"), with paise only when there are some. */
export const formatPrice = (rupees) => {
  const value = Number(rupees) || 0;
  return (Number.isInteger(value) ? WHOLE : PAISE).format(value);
};

/** A date from the API as "11 Nov 2026", or with the time: "11 Nov 2026, 4:05 pm". */
export const formatDate = (iso, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      })
    : '';
