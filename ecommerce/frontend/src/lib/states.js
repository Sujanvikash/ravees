/**
 * India's states and union territories, as the delivery address picks them. The state decides the tax on an order's
 * invoice (CGST + SGST within Tamil Nadu, IGST elsewhere), so it must be one of these; the shop API checks the same
 * list (app/core/india.py).
 */
export const STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const letters = (text) => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
const ALIASES = { tn: 'Tamil Nadu', tamilnad: 'Tamil Nadu', newdelhi: 'Delhi', orissa: 'Odisha', pondicherry: 'Puducherry' };
const BY_LETTERS = new Map([...STATES.map((name) => [letters(name), name]), ...Object.entries(ALIASES)]);

/** The state's proper name from what was typed ("tamilnadu", "TN" → "Tamil Nadu"), or '' when it isn't one. */
export const stateName = (text = '') => BY_LETTERS.get(letters(text)) ?? '';
