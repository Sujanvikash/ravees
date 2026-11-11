import { SELLER } from '../config.js';

/**
 * GST places of supply. A GSTIN starts with its state's two-digit code. An invoice to a showroom in the admin's own
 * state (Tamil Nadu) takes CGST + SGST; to any other state, IGST. The server decides it the same way.
 */
export const GST_STATES = [
  ['01', 'Jammu and Kashmir'],
  ['02', 'Himachal Pradesh'],
  ['03', 'Punjab'],
  ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'],
  ['06', 'Haryana'],
  ['07', 'Delhi'],
  ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'],
  ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'],
  ['14', 'Manipur'],
  ['15', 'Mizoram'],
  ['16', 'Tripura'],
  ['17', 'Meghalaya'],
  ['18', 'Assam'],
  ['19', 'West Bengal'],
  ['20', 'Jharkhand'],
  ['21', 'Odisha'],
  ['22', 'Chhattisgarh'],
  ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'],
  ['26', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['27', 'Maharashtra'],
  ['29', 'Karnataka'],
  ['30', 'Goa'],
  ['31', 'Lakshadweep'],
  ['32', 'Kerala'],
  ['33', 'Tamil Nadu'],
  ['34', 'Puducherry'],
  ['35', 'Andaman and Nicobar Islands'],
  ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'],
  ['38', 'Ladakh'],
];

const NAMES = new Map(GST_STATES);

/** The admin's own business is in Tamil Nadu. */
export const ADMIN_STATE = '33';

export const stateName = (code) => NAMES.get(code) ?? '';

/** The state code a GSTIN belongs to, or '' when it doesn't start with a known one. */
export const stateOfGstin = (gstin) => {
  const code = String(gstin ?? '').trim().slice(0, 2);
  return NAMES.has(code) ? code : '';
};

/** The admin's state: from its business GSTIN (Settings → Business details, else Tree Classics Trader's), else Tamil Nadu. */
export const sellerState = (settings) => stateOfGstin(settings?.bizGstin?.trim() || SELLER.gstin) || ADMIN_STATE;
