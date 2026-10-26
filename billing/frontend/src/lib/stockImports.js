/** Units per product added to a showroom by Excel stock imports (all showrooms when location is null). */
export const importedByProduct = (imports, location) => {
  const out = {};
  for (const im of imports) {
    if (location && im.location !== location) continue;
    for (const l of im.lines) out[l.code] = (out[l.code] ?? 0) + l.qty;
  }
  return out;
};
