/**
 * Helpers over the storefront's product list (StorefrontContext). Prices are rupees, GST included;
 * `price: null` (priceOnRequest) means the concierge quotes it and it can't be paid for online.
 * Never make a price up.
 */

/** True when the product has a price of its own. */
export const hasPrice = (product) => product?.price != null && !product.priceOnRequest;

/** True when the MRP is worth showing struck through: there is one and it is above the price. */
export const showsMrp = (product) => hasPrice(product) && product.mrp != null && product.mrp > product.price;

/** The products of one category, in catalogue order (all of them when `limit` is left out). */
export const productsIn = (products, category, limit) => {
  const list = category === 'all' ? products : products.filter((p) => p.category === category);
  return limit ? list.slice(0, limit) : list;
};

/**
 * A mixed selection across the catalogue: one product from each category in turn, then the next one from
 * each, and so on, so a short row never shows six ornaments in a row.
 */
export const mixedProducts = (products, limit) => {
  const byCategory = new Map();
  for (const p of products) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  const queues = [...byCategory.values()];
  const picks = [];
  for (let round = 0; picks.length < limit && queues.some((q) => q.length > round); round += 1) {
    for (const q of queues) if (q[round] && picks.length < limit) picks.push(q[round]);
  }
  return picks;
};
