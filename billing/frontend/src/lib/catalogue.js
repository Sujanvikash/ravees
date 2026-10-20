import data from '../data/products.json';

/**
 * The full product list, generated from billing/backend/seed/products-clean.xlsx by export_products.py.
 * Every product from every year is here; `inSeason` marks the ones on sale this season.
 */
const sentenceCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export const SEASON = data.season;
export const PRODUCTS = data.products.map((p) => ({ ...p, dept: sentenceCase(p.dept) }));
export const SEASON_COUNT = PRODUCTS.filter((p) => p.inSeason).length;

// Codes and barcodes both find a product. Only real barcodes (with digits) count: some rows hold words there.
const byKey = new Map();
for (const p of PRODUCTS) {
  byKey.set(p.code.toUpperCase(), p);
  if (/\d/.test(p.barcode)) byKey.set(p.barcode.toUpperCase(), p);
}

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
