/** Label style for the compact admin edit forms (collections, showrooms, testimonials): a touch smaller than FormField's default. */
export const ADMIN_LABEL = 'text-[0.75rem] text-gold-300';

/** The admin's checkbox row: a small gold box with its label to the right. */
export const ADMIN_CHECK = 'flex cursor-pointer items-center gap-2.5 text-[0.85rem] text-text-secondary';

/**
 * The ids of `list` after moving `id` one place up (dir -1) or down (+1), swapping it with `neighbourId`
 * (the next one up or down as the page shows them, which may be filtered). Null when there is nowhere to go.
 */
export const swapIds = (list, id, neighbourId) => {
  const ids = list.map((item) => item.id);
  const a = ids.indexOf(id);
  const b = ids.indexOf(neighbourId);
  if (a < 0 || b < 0) return null;
  [ids[a], ids[b]] = [ids[b], ids[a]];
  return ids;
};

// What POST /admin/images accepts.
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_MB = 15;

/** Why a file can't be uploaded as a photo, or '' when it can. */
export const photoProblem = (file) => {
  if (!PHOTO_TYPES.includes(file.type)) return `${file.name}: please use a JPEG, PNG or WebP photo.`;
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `${file.name} is over ${MAX_PHOTO_MB} MB; please use a smaller photo.`;
  return '';
};

/** A number field's text as rupees: '' → null, '12500' → 12500. */
export const rupeesOrNull = (text) => {
  const value = String(text ?? '').trim();
  return value === '' ? null : Number(value);
};
