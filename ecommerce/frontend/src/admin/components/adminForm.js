/** Label style for the compact admin edit forms (collections, showrooms, testimonials): a touch smaller than FormField's default. */
export const ADMIN_LABEL = 'text-[0.75rem] text-gold-300';

/** A name as a URL-safe id: "Gift Hampers!" → "gift-hampers". */
export const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
