import { findProduct } from './catalogue.js';

/**
 * Every time stock moved other than by a sale, newest first, for the inventory history: Excel imports, opening
 * stock of a showroom's new product, purchase orders counted in and customer returns (in), and purchase returns to
 * the admin (out). Each entry: { id, at, by, location, kind: 'import' | 'product' | 'own' | 'order' | 'customer-return' |
 * 'sent-back' | 'sent-out' | 'returned-in', ref, lines: [{ code, name, qty }], units, sign: 1 | -1, note }. Pass a location for one showroom,
 * or null for all.
 */
export const stockLog = (orders, imports, location, { returns = [], stockReturns = [] } = {}) => {
  const nameOf = (code, fallback) => fallback ?? findProduct(code)?.name ?? code;
  const entries = [];

  for (const im of imports) {
    if (location && im.location !== location) continue;
    // a showroom's own product: its opening units, or units added by hand later
    const kind = im.source === 'new-product' ? 'product' : im.source === 'own-product' || im.source === 'manual' ? 'own' : 'import';
    entries.push({ id: im.id, at: im.at, by: im.by, location: im.location, kind, ref: kind === 'import' ? im.file : im.lines[0]?.code, lines: im.lines, note: '' });
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

  // the admin's own stock: purchase orders go out of it when sent, purchase returns come in when counted
  if (!location || location === 'warehouse') {
    for (const o of orders) {
      const sent = (o.history ?? []).find((h) => h.action === 'sent');
      if (!sent) continue;
      entries.push({ id: `${o.id}-out`, at: sent.at, by: 'Admin', location: 'warehouse', kind: 'sent-out', ref: o.number, lines: o.lines, note: sent.note ?? '', sign: -1 });
    }
    for (const r of stockReturns) {
      if (r.status !== 'received') continue;
      const got = [...(r.history ?? [])].reverse().find((h) => h.action === 'received');
      const names = Object.fromEntries(r.lines.map((l) => [l.code, l.name]));
      const lines = (r.counted ?? []).map((l) => ({ code: l.code, name: nameOf(l.code, names[l.code]), qty: l.qty }));
      entries.push({ id: `${r.id}-in`, at: got?.at ?? r.updatedAt, by: 'Admin', location: 'warehouse', kind: 'returned-in', ref: r.number, lines, note: got?.note ?? '' });
    }
  }

  return entries
    .map((e) => ({ sign: 1, ...e, units: e.lines.reduce((s, l) => s + l.qty, 0) }))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
};
