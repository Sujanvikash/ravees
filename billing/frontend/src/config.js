/**
 * The shop and counter this screen runs at, printed on every receipt. There is no billing backend yet,
 * so these live here: edit them for each counter. Blank values are left off the receipt.
 */
export const STORE = {
  name: "Raave's Evergreen",
  showroom: 'Chennai · Egmore',
  address: ['No. 14, Pantheon Road, Egmore,', 'Chennai, Tamil Nadu - 600008'],
  phone: '+91 98407 88950',
  email: 'hello@raavesevergreen.com',
  gstin: '', // TODO: the showroom's GSTIN, required on a tax invoice
  upiId: '', // shown to staff when the customer pays by UPI
  counter: 'Counter 1',
  billPrefix: 'CHN', // bill numbers look like CHN/26-27/00001
  receiptNote: '', // e.g. the exchange / return policy, printed under "Thank you"
};

/** MRP and offer prices already include GST (the usual case for retail MRP), so GST is taken out, not added. */
export const PRICES_INCLUDE_GST = true;
