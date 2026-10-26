import data from '../data/products.json';

/**
 * The full product list, generated from billing/backend/seed/products-clean.xlsx by export_products.py.
 * Every product from every year is here; `inSeason` marks the ones on sale this season.
 *
 * Showrooms can also add their own products (items without a barcode). Those are coded with the showroom's
 * bill prefix (CHN-0001, BLR-0001…) so two showrooms never make the same code, carry `shop: { location, by,
 * at }`, and are kept in this browser under SHOP_PRODUCTS_KEY until the billing backend exists. They are
 * appended to PRODUCTS, so everything that looks products up (billing, search, orders, imports) finds them.
 *
 * The admin can change which products are in this season (Inventory → In season). Those changes are kept
 * under SEASON_EDITS_KEY ({ [code]: true | false }) on top of the list from the Excel, so they can be undone.
 */
const sentenceCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export const SHOP_PRODUCTS_KEY = 'billing-shop-products';
export const SEASON_EDITS_KEY = 'billing-season-edits';
export const SEASON = data.season;
export const PRODUCTS = data.products.map((p) => ({ ...p, dept: sentenceCase(p.dept) }));
export const DEPARTMENTS = [...new Set(PRODUCTS.map((p) => p.dept))].sort();
export const GST_RATES = [0, 5, 12, 18, 28];

// Codes and barcodes both find a product. Only real barcodes (with digits) count: some rows hold words there.
const byKey = new Map();
const index = (p) => {
  byKey.set(p.code.toUpperCase(), p);
  if (/\d/.test(p.barcode)) byKey.set(p.barcode.toUpperCase(), p);
};
PRODUCTS.forEach(index);

const loadShopProducts = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SHOP_PRODUCTS_KEY)) ?? [];
  } catch {
    return [];
  }
};
for (const p of loadShopProducts()) {
  PRODUCTS.push(p);
  index(p);
}

const loadSeasonEdits = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SEASON_EDITS_KEY)) ?? {};
  } catch {
    return {};
  }
};
const seasonEdits = loadSeasonEdits();
for (const p of PRODUCTS) if (p.code in seasonEdits) p.inSeason = seasonEdits[p.code];

// Lets screens re-render when a product is added (see hooks/useCatalogue.js): a new array each time.
let snapshot = PRODUCTS.slice();
const listeners = new Set();
export const subscribeCatalogue = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const productsSnapshot = () => snapshot;

export const seasonCount = () => PRODUCTS.filter((p) => p.inSeason).length;

/** The next free code for a showroom's own product: its bill prefix and a running number, e.g. CHN-0007. */
export const nextShopCode = (prefix) => {
  const taken = PRODUCTS.filter((p) => p.code.startsWith(`${prefix}-`)).map((p) => Number(p.code.slice(prefix.length + 1)) || 0);
  return `${prefix}-${String(Math.max(0, ...taken) + 1).padStart(4, '0')}`;
};

/** Adds a showroom's own product to the list and saves it. Returns the product. */
export const addShopProduct = (product) => {
  if (byKey.has(product.code.toUpperCase())) throw new Error(`Code ${product.code} is already in use.`);
  PRODUCTS.push(product);
  index(product);
  try {
    window.localStorage.setItem(SHOP_PRODUCTS_KEY, JSON.stringify(PRODUCTS.filter((p) => p.shop)));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
  snapshot = PRODUCTS.slice();
  listeners.forEach((fn) => fn());
  return product;
};

/** Admin: puts a product in this season, or takes it out. */
export const setInSeason = (code, on) => {
  const product = byKey.get(code.toUpperCase());
  if (!product) return;
  product.inSeason = on;
  seasonEdits[product.code] = on;
  try {
    window.localStorage.setItem(SEASON_EDITS_KEY, JSON.stringify(seasonEdits));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
  snapshot = PRODUCTS.slice();
  listeners.forEach((fn) => fn());
};

/** A scanned barcode or typed product code → its product, or undefined. */
export const findProduct = (key) => byKey.get(String(key).trim().toUpperCase());

/** Products for typed text: codes that start with it first, then names that contain every typed word. */
export const searchProducts = (query, { seasonOnly = false, limit = 8 } = {}) => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const byCode = [];
  const byName = [];
  for (const p of PRODUCTS) {
    if (seasonOnly && !p.inSeason) continue;
    if (p.code.toLowerCase().startsWith(q)) byCode.push(p);
    else if (byName.length < limit && words.every((w) => p.name.toLowerCase().includes(w))) byName.push(p);
    if (byCode.length >= limit) break;
  }
  return [...byCode, ...byName].slice(0, limit);
};
