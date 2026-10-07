const PHONE_E164 = '+919840788950';
export const PHONE_DISPLAY = '+91 98407 88950';
export const PHONE_HREF = `tel:${PHONE_E164}`;
export const ORDER_HOURS = '8 AM – 10 PM';

export const whatsappHref = (text) =>
  `https://wa.me/${PHONE_E164.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
