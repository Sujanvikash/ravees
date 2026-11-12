// The shop's number: calls, WhatsApp, the footer and the contact page.
const PHONE_E164 = '+918015432248';
export const PHONE_DISPLAY = '+91 80154 32248';
export const PHONE_HREF = `tel:${PHONE_E164}`;
export const ORDER_HOURS = '8 AM – 10 PM';
// The shop's mailbox (Zoho Mail): the contact page, the invoices and the emails it sends.
export const EMAIL = 'raaves@christmasraave.in';

export const whatsappHref = (text) =>
  `https://wa.me/${PHONE_E164.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** A phone number as a tel: link ("+91 98407 88949" → "tel:+919840788949"); of "a / b", the first. */
export const telHref = (phone = '') => `tel:${phone.split('/')[0].replace(/[^\d+]/g, '')}`;
