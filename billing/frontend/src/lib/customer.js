/** The last 10 digits typed, so "+91 98407-88950" and "9840788950" are the same number. */
export const phoneDigits = (phone) => phone.replace(/\D/g, '').slice(-10);

// Indian mobile: 10 digits starting 6–9, with an optional +91 / 91 / 0 in front.
const INDIAN_MOBILE = /^(?:91|0)?[6-9]\d{9}$/;

/** True for a valid Indian mobile number; spaces, dashes, brackets and a leading +91 or 0 are fine. */
export const isValidMobile = (phone) => INDIAN_MOBILE.test(phone.replace(/\D/g, ''));

/** A customer name is required on every bill: at least two letters once trimmed. */
export const isValidName = (name) => name.trim().replace(/[^\p{L}]/gu, '').length >= 2;

/** "+91 98407 88950" */
export const formatMobile = (phone) => {
  const d = phoneDigits(phone);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
};

/** "Priya · +91 98407 88950", "+91 98407 88950" without a name, or "Walk-in" with neither. */
export const customerLabel = (phone = '', name = '') => {
  const parts = [name.trim(), phoneDigits(phone).length === 10 ? formatMobile(phone) : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Walk-in';
};
