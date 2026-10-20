// The sizes list is scraped from one of the specs (e.g. "Feet: 10 Feet, 6 Feet"); pages show the sizes on their
// own, so that spec row is left out instead of repeating the same sizes.
export const withoutSizeSpec = (product) => {
  const sizes = product.sizes.join('|');
  return sizes ? product.specs.filter((spec) => spec.value.split(/,\s*/).join('|') !== sizes) : product.specs;
};
