import { findProduct } from './catalogue.js';

/**
 * Every time stock moved other than by a sale, newest first, for the inventory history: Excel imports, opening
 * stock of a showroom's new product, purchase orders counted in and customer returns (in), and stock sent back to
 * the admin (out). Each entry: { id, at, by, location, kind: 'import' | 'product' | 'order' | 'customer-return' |
 * 'sent-back', ref, lines: [{ code, name, qty }], units, sign: 1 | -1, note }. Pass a location for one showroom,
 * or null for all.
 */
export const stockLog = (orders, imports, location, { returns = [], stockReturns = [] } = {}) => {
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

  for (const r of returns) {
    if (location && r.location !== location) continue;
    entries.push({ id: r.id, at: r.at, by: r.by, location: r.location, kind: 'customer-return', ref: `${r.returnNo} · ${r.billNo}`, lines: r.lines, note: r.reason ?? '' });
  }

  for (const r of stockReturns) {
    if (location && r.location !== location) continue;
    const got = r.status === 'received' ? ` · admin counted ${(r.counted ?? []).reduce((s, l) => s + l.qty, 0)}` : ' · on its way';
    entries.push({ id: r.id, at: r.createdAt, by: r.history?.[0]?.by ?? '', location: r.location, kind: 'sent-back', ref: r.number, lines: r.lines, note: `${r.note || ''}${got}`.replace(/^ · /, ''), sign: -1 });
  }

  return entries
    .map((e) => ({ sign: 1, ...e, units: e.lines.reduce((s, l) => s + l.qty, 0) }))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
};
