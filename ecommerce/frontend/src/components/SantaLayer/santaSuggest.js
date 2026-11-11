// What goes well with what Santa just caught: category → complementary category.
const PAIRS = {
  "christmas-trees": "tree-hangings",
  "tree-hangings": "christmas-lights",
  "christmas-lights": "wreath-garlands",
  "wreath-garlands": "christmas-lights",
  "nativity-sets": "christmas-lights",
  "santa-toy": "tree-hangings",
  "home-decors": "wreath-garlands",
};

/** { id, label } of a category (from the storefront's `categories`) that pairs with the product, or null. */
export const suggestFor = (product, categories = []) => {
  const id = PAIRS[product?.category];
  const category = id && categories.find((c) => c.id === id);
  return category ? { id, label: category.name } : null;
};
