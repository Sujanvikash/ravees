/** The last 10 digits typed, so "+91 98407-88950" and "9840788950" are the same number. */
export const phoneDigits = (phone) => phone.replace(/\D/g, '').slice(-10);

/** "+91 98407 88950" for a full number, else "Walk-in". */
export const customerLabel = (phone) => {
  const d = phoneDigits(phone);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : 'Walk-in';
};
