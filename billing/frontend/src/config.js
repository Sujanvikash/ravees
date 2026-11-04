/**
 * The shop and its showrooms. The store list is loaded from the billing API at start-up (loadLocations); the
 * admin adds and removes stores on the Stores page. Each store prints its own address on receipts and numbers
 * its own bills (CHN262700001, BLR262700001…). A store's own name/address/GSTIN live in its Settings; the
 * built-in details below are only a fall-back for the original five when a field is left blank.
 */
export const BRAND = {
  name: "Raave's Evergreen",
  tagline: 'Christmas Tree & Decoration · Since 1997',
  email: 'hello@raavesevergreen.com',
  receiptNote: '', // e.g. the exchange / return policy, printed under "Thank you"
};

/** The fixed policy note printed at the foot of every bill, the same for every showroom (not editable). */
export const BILL_FOOTER = ['*NO EXCHANGE *NO RETURN', '*NO GUARANTEE ON COLOURS'];

// Receipt fall-back address / phone for the original showrooms, by id. A store added later fills in its own on
// Settings → Shop on the bill (there is nothing to fall back to, and that's fine).
const DETAILS = {
  chennai: { address: ['No. 14, Pantheon Road, Egmore,', 'Chennai, Tamil Nadu - 600008'], phone: '+91 98407 88950 / +91 44 2819 3715' },
  bengaluru: { address: ['Indiranagar 100ft Road, Stage 2,', 'Bengaluru, Karnataka - 560038'], phone: '+91 98407 88950' },
  goa: { address: ['MG Road, Near Municipal Garden,', 'Panaji, Goa - 403001'], phone: '+91 98407 88950' },
  mumbai: { address: ['Hill Road, Near Mehboob Studio, Bandra West,', 'Mumbai, Maharashtra - 400050'], phone: '+91 98407 88950' },
  pune: { address: ['Lane 7, Koregaon Park,', 'Pune, Maharashtra - 411001'], phone: '+91 98407 88950' },
};

/** The showrooms, filled from the server at start-up. Each: { id, city, area, billPrefix, active, address, phone }.
 *  Mutated in place by loadLocations so modules that imported it see the update. */
export const LOCATIONS = [];

/** The admin's own stock (the warehouse): purchase returns by the showrooms go in, purchase orders to the
 *  showrooms come out. Not a showroom: no login, no bills, no cash close. */
export const WAREHOUSE = { id: 'warehouse', city: 'Admin', area: 'Warehouse', billPrefix: 'ADM', address: [], phone: '', gstin: '', upiId: '' };

/** Every place that holds stock: the admin's first, then the showrooms. Rebuilt whenever the stores load. */
export const STOCK_PLACES = [WAREHOUSE];

/** Replaces the in-memory store list with the server's (the /locations response). Keeps LOCATIONS and
 *  STOCK_PLACES as the same array objects so existing imports stay valid. */
export const loadLocations = (stores) => {
  LOCATIONS.length = 0;
  for (const s of stores) {
    LOCATIONS.push({ ...s, address: DETAILS[s.id]?.address ?? [], phone: DETAILS[s.id]?.phone ?? '', gstin: '', upiId: '' });
  }
  STOCK_PLACES.length = 0;
  STOCK_PLACES.push(WAREHOUSE, ...LOCATIONS);
  return LOCATIONS;
};

export const locationById = (id) => STOCK_PLACES.find((l) => l.id === id);

/** The stores still in use (not removed): shown on the sign-in screen and in the pickers. */
export const activeLocations = () => LOCATIONS.filter((l) => l.active !== false);

/** MRP and offer prices already include GST (the usual case for retail MRP), so GST is taken out, not added. */
export const PRICES_INCLUDE_GST = true;
