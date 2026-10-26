import { api } from './api.js';

/**
 * The product catalogue, loaded from the billing API after sign-in (loadCatalogue) and kept in memory: every
 * product from every year, plus the showrooms' own products (items without a barcode, coded with the
 * showroom's bill prefix: CHN-0001, BLR-0001…). `inSeason` marks what is on sale this season; the admin can
 * change it (setInSeason). Screens that list products re-render through hooks/useCatalogue.js.
 */

export let SEASON = '';
export const PRODUCTS = [];
export let DEPARTMENTS = [];
export const GST_RATES = [0, 5, 12, 18, 28];

// Codes and barcodes both find a product. Only real barcodes (with digits) count: some rows hold words there.
const byKey = new Map();
const index = (p) => {
  byKey.set(p.code.toUpperCase(), p);
  if (/\d/.test(p.barcode)) byKey.set(p.barcode.toUpperCase(), p);
};

let snapshot = [];
const listeners = new Set();
export const subscribeCatalogue = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const productsSnapshot = () => snapshot;
const changed = () => {
  snapshot = PRODUCTS.slice();
  DEPARTMENTS = [...new Set(PRODUCTS.map((p) => p.dept).filter(Boolean))].sort();
  listeners.forEach((fn) => fn());
};

/** Fetches the whole catalogue from the server and replaces what is in memory. */
export const loadCatalogue = async () => {
  const data = await api('/products');
  SEASON = data.season;
  PRODUCTS.length = 0;
  byKey.clear();
  for (const p of data.products) {
    PRODUCTS.push(p);
    index(p);
  }
  changed();
};

export const seasonCount = () => PRODUCTS.filter((p) => p.inSeason).length;

/** The code the next product of a showroom will probably get (the server hands out the real one). */
export const nextShopCode = (prefix) => {
  const taken = PRODUCTS.filter((p) => p.code.startsWith(`${prefix}-`)).map((p) => Number(p.code.slice(prefix.length + 1)) || 0);
  return `${prefix}-${String(Math.max(0, ...taken) + 1).padStart(4, '0')}`;
};

/** Adds a showroom's own product on the server ({ location?, name, dept, mrp, offer?, cost?, gst, hsn }), then
 * to the list here. Returns the product, with the code the server gave it. */
export const addShopProduct = async (fields) => {
  const product = await api('/products', { method: 'POST', body: fields });
  PRODUCTS.push(product);
  index(product);
  changed();
  return product;
};

/** Admin: puts a product in this season, or takes it out. Shown straight away; undone if the server refuses. */
export const setInSeason = async (code, on) => {
  const product = byKey.get(code.toUpperCase());
  if (!product) return;
  product.inSeason = on;
  changed();
  try {
    await api(`/products/${encodeURIComponent(product.code)}`, { method: 'PATCH', body: { inSeason: on } });
  } catch (e) {
    product.inSeason = !on;
    changed();
    throw e;
  }
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
