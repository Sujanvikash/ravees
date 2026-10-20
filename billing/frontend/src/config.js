/**
 * The shop and its five showrooms. There is no billing backend yet, so these live here. Each location
 * prints its own address on receipts and numbers its own bills (CHN/26-27/00001, BLR/26-27/00001…).
 * Blank values are left off the receipt.
 */
export const BRAND = {
  name: "Raave's Evergreen",
  tagline: 'Christmas Tree & Decoration · Since 1997',
  email: 'hello@raavesevergreen.com',
  receiptNote: '', // e.g. the exchange / return policy, printed under "Thank you"
};

// Addresses and phones are the showrooms listed on the website (ecommerce/frontend/src/data/showrooms.js).
export const LOCATIONS = [
  {
    id: 'chennai',
    city: 'Chennai',
    area: 'Egmore',
    billPrefix: 'CHN',
    address: ['No. 14, Pantheon Road, Egmore,', 'Chennai, Tamil Nadu - 600008'],
    phone: '+91 98407 88950 / +91 44 2819 3715',
    gstin: '', // TODO: each showroom's GSTIN, required on a tax invoice
    upiId: '',
  },
  {
    id: 'bengaluru',
    city: 'Bengaluru',
    area: 'Indiranagar',
    billPrefix: 'BLR',
    address: ['Indiranagar 100ft Road, Stage 2,', 'Bengaluru, Karnataka - 560038'],
    phone: '+91 98407 88950',
    gstin: '',
    upiId: '',
  },
  {
    id: 'goa',
    city: 'Goa',
    area: 'Panaji',
    billPrefix: 'GOA',
    address: ['MG Road, Near Municipal Garden,', 'Panaji, Goa - 403001'],
    phone: '+91 98407 88950',
    gstin: '',
    upiId: '',
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    area: 'Bandra West',
    billPrefix: 'MUM',
    address: ['Hill Road, Near Mehboob Studio, Bandra West,', 'Mumbai, Maharashtra - 400050'],
    phone: '+91 98407 88950',
    gstin: '',
    upiId: '',
  },
  {
    id: 'pune',
    city: 'Pune',
    area: 'Koregaon Park',
    billPrefix: 'PUN',
    address: ['Lane 7, Koregaon Park,', 'Pune, Maharashtra - 411001'],
    phone: '+91 98407 88950',
    gstin: '',
    upiId: '',
  },
];

export const locationById = (id) => LOCATIONS.find((l) => l.id === id);

/** MRP and offer prices already include GST (the usual case for retail MRP), so GST is taken out, not added. */
export const PRICES_INCLUDE_GST = true;
