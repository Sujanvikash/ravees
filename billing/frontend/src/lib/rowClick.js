/**
 * A table row that opens and closes its details when clicked anywhere on it, not only on its arrow. Clicks on a
 * button, link or field inside the row still do their own thing.
 */
export const rowClick = (toggle) => (e) => {
  if (e.target.closest('button, a, input, select, textarea, label')) return;
  toggle();
};
