import { locationById } from '../config.js';
import { api, ApiError } from './api.js';
import { buildBill } from './bill.js';
import { customerLabel } from './customer.js';

/**
 * Billing while the internet is down. A showroom counter keeps the last products, stock and records it loaded
 * (keep / kept, in IndexedDB), so it opens and bills with no connection. A bill it can't send is numbered from the
 * counter's own offline series (CHN2627OF020001: the showroom's prefix, the financial year, OF, this browser's
 * counter number and its own running number), printed as usual, and put in the outbox. StoreContext sends the
 * outbox in order once the server answers again; the server keeps each bill's offline number and time.
 *
 * Everything is per showroom and apart for the demo: `key` is "pune" or "demo-pune" (offlineKey).
 */

export const offlineKey = (session) => (session?.location ? `${session.demo ? 'demo-' : ''}${session.location}` : null);

const read = (name, fallback) => {
  try {
    const stored = window.localStorage.getItem(name);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const write = (name, value) => {
  try {
    window.localStorage.setItem(name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// ---- The counter's offline number series -------------------------------------------------------------------

const seriesKey = (key) => `billing-offline-${key}`;

/** The financial year (April to March) a date falls in, as "2627". */
const yearOf = (date) => {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(start).slice(2)}${String(start + 1).slice(2)}`;
};

/** Asks the server for this browser's counter number, once, while online. Until it has one, the counter can't
 *  bill offline. */
export const ensureOfflineCounter = async (key) => {
  if (!key || read(seriesKey(key), null)?.counter) return;
  const { counter } = await api('/sales/offline-counter', { method: 'POST' });
  write(seriesKey(key), { counter, year: '', next: 1 });
};

const nextOffline = (key, location, date) => {
  const series = read(seriesKey(key), null);
  const prefix = locationById(location)?.billPrefix;
  if (!series?.counter || !prefix) return null;
  const year = yearOf(date);
  const seq = series.year === year ? series.next : 1;
  if (seq > 9999) return null;
  return { series, year, seq, billNo: `${prefix}${year}OF${String(series.counter).padStart(2, '0')}${String(seq).padStart(4, '0')}` };
};

/** The number the next offline bill will get, for showing on the counter; null when it can't bill offline. */
export const peekOfflineNo = (key, location, date = new Date()) => nextOffline(key, location, date)?.billNo ?? null;

/** Uses up the next offline bill number, or null when this counter has none (never online since it was set up). */
const takeOfflineNo = (key, location, date) => {
  const next = nextOffline(key, location, date);
  if (!next || !write(seriesKey(key), { ...next.series, year: next.year, next: next.seq + 1 })) return null;
  return next.billNo;
};

// ---- The outbox: bills made offline, waiting to be sent ------------------------------------------------------
// Read and written straight from localStorage on every change (not kept in React state), so a second tab on the
// same counter never writes over a bill the first one queued.

const outboxKey = (key) => `billing-outbox-${key}`;
const listeners = new Set();
const cache = { raw: null, list: [] };

/** [{ body, sale, error? }] oldest first: body is what goes to POST /sales, sale is the bill as shown and printed
 *  here until the server has it, error is why the server turned it down (it stays until it is taken). */
const NONE = [];

export const readOutbox = (key) => {
  if (!key) return NONE;
  let raw = null;
  try {
    raw = window.localStorage.getItem(outboxKey(key));
  } catch {
    // no storage: nothing queued
  }
  if (raw !== cache.raw) {
    cache.raw = raw;
    try {
      cache.list = raw ? JSON.parse(raw) : [];
    } catch {
      cache.list = [];
    }
  }
  return cache.list;
};

const changeOutbox = (key, fn) => {
  const ok = write(outboxKey(key), fn(readOutbox(key)));
  listeners.forEach((l) => l());
  return ok;
};

export const removeFromOutbox = (key, id) => changeOutbox(key, (list) => list.filter((x) => x.body.id !== id));
export const markOutbox = (key, id, error) =>
  changeOutbox(key, (list) => list.map((x) => (x.body.id === id ? { ...x, error } : x)));

/** For useSyncExternalStore: changes made here and in other tabs. */
export const subscribeOutbox = (fn) => {
  listeners.add(fn);
  const onStorage = (e) => e.key?.startsWith('billing-outbox-') && fn();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
};

const paisa = (n) => Math.paisa(n * 100) / 100;

/** The payment as the server will keep it (sales/service.py _payment), for a bill with no exchange credit. */
const paymentOf = (payment, payable) => {
  const later = Math.min(paisa(payment.later ?? 0), payable);
  const due = paisa(payable - later);
  const extra = later > 0 ? { later } : {};
  const base = { approval: '', split: null, print: Boolean(payment.print), ...extra };
  if (due <= 0) return { ...base, method: later > 0 ? 'later' : 'credit', received: 0, change: 0 };
  if (payment.method === 'cash') {
    return { ...base, method: 'cash', received: payment.received, change: Math.max(paisa(payment.received - due), 0) };
  }
  const split =
    payment.method === 'split'
      ? { cash: payment.split?.cash ?? 0, upi: payment.split?.upi ?? 0, card: Math.max(paisa(due - (payment.split?.cash ?? 0) - (payment.split?.upi ?? 0)), 0) }
      : null;
  return { ...base, method: payment.method, received: due, approval: payment.method === 'card' ? (payment.approval ?? '').trim() : '', split };
};

/**
 * A bill ({ id, lines, phone, name, payment, discount? }) the server couldn't be reached for: numbered from this
 * counter's offline series, priced from the products loaded here, and put in the outbox. Returns it in the shape
 * the server sends a sale (plus offline: true), to show and print. Throws when this counter can't bill offline.
 */
export const queueOfflineSale = (key, session, bill) => {
  const at = new Date();
  const billNo = takeOfflineNo(key, session.location, at);
  if (!billNo) {
    throw new ApiError('Can’t reach the billing server, and this counter isn’t set up to bill offline yet: it has to be online once first.', 0);
  }
  const { lines, ...totals } = buildBill(bill.lines, bill.discount ?? null);
  if (!lines.length) throw new ApiError('Can’t reach the billing server, and these products aren’t in the list kept on this counter.', 0);
  const sale = {
    id: bill.id,
    billNo,
    location: session.location,
    at: at.toISOString(),
    phone: bill.phone,
    name: bill.name,
    customer: customerLabel(bill.phone, bill.name),
    by: session.username,
    lines: lines.map((l) => ({ code: l.product.code, name: l.product.name, qty: l.qty, price: l.price, mrp: l.product.mrp, cost: l.product.cost ?? 0, gst: l.product.gst })),
    totals: {
      count: totals.count,
      qty: totals.qty,
      mrpTotal: paisa(totals.mrpTotal),
      savings: paisa(totals.savings),
      discount: paisa(totals.discount),
      discountKind: totals.discountKind,
      discountValue: totals.discountValue,
      taxable: paisa(totals.taxable),
      tax: paisa(totals.tax),
      gstRows: totals.gstRows.map((r) => ({ rate: r.rate, taxable: paisa(r.taxable), tax: paisa(r.tax) })),
      roundOff: paisa(totals.roundOff),
      payable: totals.payable,
    },
    payment: paymentOf(bill.payment, totals.payable),
    balance: Math.min(paisa(bill.payment.later ?? 0), totals.payable),
    collections: [],
    offline: true,
  };
  const body = { ...bill, offline: { billNo, at: sale.at } };
  if (!changeOutbox(key, (list) => [...list, { body, sale }])) {
    throw new ApiError('Can’t reach the billing server, and this browser couldn’t keep the bill to send later (its storage is full).', 0);
  }
  return sale;
};
