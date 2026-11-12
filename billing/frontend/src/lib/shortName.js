/**
 * A product's name cut short for the 80mm bill, so each item stays on one line: the name up to its first comma, or
 * up to the second comma when the first part is under 10 characters ("TREE, GREEN, 6FT" → "TREE, GREEN").
 *   "10CM GLITTER BALL, 2PCS/PET BOX,ONE COLOR PER BOX, 2 COLORS…" → "10CM GLITTER BALL"
 * A name without a comma is kept whole (the bill still cuts it off with … if it's too long for the line).
 */
export const shortName = (name = '') => {
  const parts = name
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  return parts[0].length < 10 ? `${parts[0]}, ${parts[1]}` : parts[0];
};
