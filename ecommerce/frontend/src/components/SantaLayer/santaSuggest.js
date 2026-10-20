import { CATEGORIES } from "../../data/categories.js";

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

/** { id, label } of a category that pairs with the product, or null. */
export const suggestFor = (product) => {
  const id = PAIRS[product?.category];
  const category = id && CATEGORIES.find((c) => c.id === id);
  return category ? { id, label: category.name } : null;
};
