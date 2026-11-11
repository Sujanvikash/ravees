/**
 * The shop and its showrooms. The store list is loaded from the billing API at start-up (loadLocations); the
 * admin adds and removes stores on the Stores page. Each store prints its own business name, address and GSTIN on
 * its bills and numbers them itself (CHN262700001, PLK262700001…). The built-in details below are the five
 * stores'; a store's Settings (Shop on the bill) changes any of them, and a field left blank there prints these.
 */
export const BRAND = {
  name: "Raave's Evergreen",
  tagline: 'Christmas Tree & Decoration · Since 1997',
  email: 'hello@raavesevergreen.com',
  receiptNote: '', // e.g. the exchange / return policy, printed under "Thank you"
};

/** The admin's own business, the seller on every tax invoice to a showroom (Raave's Evergreen is the brand, not the
 *  seller). Settings → Business details for invoices changes any of these; a field left blank there prints these. */
export const SELLER = {
  name: 'TREE CLASSICS TRADER',
  address: 'No. 405/2A, Assisi Nagar, Kumarappapuram Main Road, Madhavaram, Chennai – 600 060', // registered office
  phone: '9940193267',
  gstin: '33AAVFT1940M1ZN',
};

/** The fixed policy note printed at the foot of every bill, the same for every showroom (not editable). */
export const BILL_FOOTER = ['*NO EXCHANGE *NO RETURN', '*NO GUARANTEE ON COLOURS'];

// Each store's own business as its bills and the admin's invoices to it name it, by id, and the GST code of the state
// it is in (the place of supply on an invoice to it). A store added later fills in its own on Settings → Shop on the
// bill (there is nothing to fall back to, and that's fine); its state comes from its GSTIN or is chosen on the invoice.
const SIANNA = { name: 'SIANNA COLLECTION', phone: '9751665555', gstin: '33AFUPE5958A1ZF', state: '33' };
const DETAILS = {
  chennai: {
    ...SIANNA,
    address: ['New No. 54, Old No. 18, Casa Major Road,', 'Egmore, Chennai – 600 008', '(Opp. Don Bosco School Gate 3)'],
  },
  palavakkam: {
    ...SIANNA,
    address: ['# 1/134, First Floor, East Coast Road,', 'Palavakkam, Chennai – 600 041', '(Above Sree Venkateswara Traders,', 'below One 2 Lifestyle Fitness Studio)'],
  },
  cochin: {
    name: 'CHRISTMAS CELEBRATIONS',
    address: [
      'Anton Hotel, Metro Pillar No. 634, Banerjee Road,',
      'Kacheripady, Ernakulam North P.O., PIN – 682 018',
      '(Adjacent to Excise Zonal Headquarters & near Seematti Silks)',
    ],
    phone: '98408 49124 / 98956 41663',
    gstin: '32ASOPJ1135B1ZC',
    state: '32',
  },
  mumbai: {
    name: 'CHRISTMAS MART',
    address: ['No. 85, 1st Floor, Hill Road, Gitaneele Arcade,', 'Bandra West, Mumbai, Maharashtra – 400 050', '(Next to Elco Market)'],
    phone: '80154 32248 / 98407 88948',
    gstin: '27ACCPV5767F1Z6',
    state: '27',
  },
  pune: {
    name: 'SPARKEL CHRISTMAS',
    address: ['ABM No. 8, Kumar Plaza, First Floor,', 'MG Road, Camp, Pune, Maharashtra – 411 001'],
    phone: '82202 63913 / 9962424246',
    gstin: '27DDFPR0896L1ZT',
    state: '27',
  },
};

/** The showrooms, filled from the server at start-up. Each: { id, city, area, billPrefix, active, name, address, phone,
 *  gstin, state }. Mutated in place by loadLocations so modules that imported it see the update. */
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
    const own = DETAILS[s.id] ?? {};
    LOCATIONS.push({ ...s, name: own.name ?? '', address: own.address ?? [], phone: own.phone ?? '', gstin: own.gstin ?? '', state: own.state ?? '', upiId: '' });
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
