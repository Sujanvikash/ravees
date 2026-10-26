import { findProduct } from './catalogue.js';

/**
 * Every time stock was added, newest first, for the inventory history: Excel imports, opening stock of a
 * showroom's new product, and purchase orders counted in. Each entry: { id, at, by, location,
 * kind: 'import' | 'product' | 'order', ref, lines: [{ code, name, qty }],
 * units, note }. Pass a location for one showroom, or null for all.
 */
export const stockLog = (orders, imports, location) => {
  const nameOf = (code, fallback) => fallback ?? findProduct(code)?.name ?? code;
  const entries = [];

  for (const im of imports) {
    if (location && im.location !== location) continue;
    const product = im.source === 'new-product';
    entries.push({ id: im.id, at: im.at, by: im.by, location: im.location, kind: product ? 'product' : 'import', ref: product ? im.lines[0]?.code : im.file, lines: im.lines, note: '' });
  }

  for (const o of orders) {
    if (o.status !== 'received' || (location && o.location !== location)) continue;
    const done = [...(o.history ?? [])].reverse().find((h) => h.action === 'received');
    const names = Object.fromEntries(o.lines.map((l) => [l.code, l.name]));
    const lines = (o.counted ?? []).filter((l) => l.qty > 0).map((l) => ({ code: l.code, name: nameOf(l.code, names[l.code]), qty: l.qty }));
    entries.push({ id: o.id, at: done?.at ?? o.updatedAt, by: done?.by ?? '', location: o.location, kind: 'order', ref: o.number, lines, note: done?.note ?? '' });
  }

  return entries.map((e) => ({ ...e, units: e.lines.reduce((s, l) => s + l.qty, 0) })).sort((a, b) => new Date(b.at) - new Date(a.at));
};
