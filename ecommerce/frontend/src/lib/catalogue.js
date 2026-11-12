/**
 * Helpers over the storefront's product list (StorefrontContext). Every product on sale has a price (rupees,
 * GST included); one without a price isn't for sale yet, and the shop leaves it out. Never make a price up.
 * A store exclusive (`storeOnly`) is shown, with or without a price, but sold only in the stores: it never goes
 * in the cart.
 */

/** True when the MRP is worth showing struck through: there is one and it is above the price. */
export const showsMrp = (product) => product?.price != null && product?.mrp != null && product.mrp > product.price;

/** Whether the product can go in the cart: sold online (not a store exclusive) and in stock. */
export const canBuy = (product) => Boolean(product?.inStock && !product.storeOnly);

/** The product's badge: "Store Exclusive", "In Stock" or "Out of Stock", with its Badge variant. */
export const stockBadge = (product) =>
  product.storeOnly
    ? { label: 'Store Exclusive', variant: 'gold' }
    : product.inStock
      ? { label: 'In Stock', variant: 'emerald' }
      : { label: 'Out of Stock', variant: 'ruby' };

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
