/**
 * A random id (UUID v4) for a record made here: the server uses it to save a bill, return or import only once
 * if it is sent again. crypto.randomUUID only exists on https and localhost; a counter opening the app over the
 * shop's network (http://192.168…) gets the same from crypto.getRandomValues.
 */
export const newId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
