import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { api, download, unreachable } from '../lib/api.js';
import { ensureOfflineCounter, markOutbox, offlineKey, queueOfflineSale, readOutbox, removeFromOutbox, subscribeOutbox } from '../lib/offline.js';
import { keep, kept } from '../lib/snapshots.js';
import { newId } from '../lib/uid.js';

/**
 * Sales, returns, stock, purchase orders, quotations, purchase returns, cash closes and the admin's settings, from
 * the billing API (billing/backend). They are loaded once after sign-in (load), then kept fresh every 30 seconds
 * and when the window comes back into focus, so the admin sees the showrooms' bills as they happen. Every change
 * goes to the server first; what it saves (with its bill or order number) is what shows here.
 *
 * A showroom gets only its own records; the admin every showroom's. A demo sign-in gets the demo's records.
 *
 * Offline (a showroom counter only, see lib/offline.js): the records last loaded are kept in this browser and
 * used when the server can't be reached at start-up. A bill made while it can't be reached goes to the outbox and
 * is shown here at once (in sales, and off stock); the outbox is sent in order as soon as the server answers.
 *
 *   sales    [{ id, billNo, at, location, phone, name, customer, lines: [{ code, name, qty, price, mrp, cost, gst }],
 *              totals, payment, balance, collections: [{ id, receiptNo, at, amount, payment, by }] }]
 *            (balance: still owed on a credit bill; collections: payments towards it since, see lib/payment.js)
 *   returns  credit notes: [{ id, returnNo, saleId, billNo, location, at, kind: return | exchange, lines, amount,
 *              refund, balanceOff, exchangeBillNo }]
 *   stock    { [location]: { [code]: qty } }     (can go negative if billed beyond what was counted in)
 *   orders   purchase orders, see lib/orders.js: a showroom's request → fulfilled by the admin's transfer invoice
 *   quotes   quotations: priced lists for a customer, never a bill
 *   imports  stock added straight from an Excel: [{ id, at, by, username, location, file, lines, source? }]
 *   stockReturns  stock a showroom sent back to the admin: [{ id, number, location, status: sent | received, … }]
 *   boxes    the admin's boxes (admin only; a showroom gets none): [{ id, boxNo, stockNo, shipment, supplier,
 *              location, invoiceId, status: in_stock | invoiced | stocked, lines: [{ code, name, qty }], history }]
 *   invoices transfer invoices, the admin's bills to a showroom for boxes at cost + 18%: [{ id, number, location,
 *              status: raised | paid | stocked | cancelled, lines: [{ code, name, qty, cost, rate, amount }],
 *              markupPct, subtotal, total, ewayNo, billNo, docName, hasDocument, paidAt, paidRef, orderId, boxIds,
 *              history }]
 *   closes   daily cash closes: [{ location, day, expected, counted, difference, … }]
 *   settings the admin's switches: see DEFAULT_SETTINGS
 */
const StoreContext = createContext(null);

/** quotePrint: showrooms may print quotations. theme: classic | light | dark; wash (Light): light | lighter |
 *  lightest; effect: none | snow | glow | both (always behind the app, in front on sign-in); snow: light | medium |
 *  heavy | blizzard; strip (Light): green | white; showGst: when off, no GST is shown anywhere (bills, quotations,
 *  figures) and prices are simply the selling price. requireName / requireMobile: whether the counter must have
 *  each before a bill can be collected (a quotation always needs both). */
export const DEFAULT_SETTINGS = {
  quotePrint: true,
  theme: 'classic',
  wash: 'lighter',
  effect: 'none',
  snow: 'light',
  strip: 'green',
  font: 'normal',
  lang: 'en',
  storeName: '',
  storeAddress: '',
  storePhone: '',
  gstin: '',
  composition: true,
  showGst: true,
  requireName: true,
  requireMobile: true,
};

const REFRESH_MS = 30_000;
const SETTINGS_KEY = 'billing-settings'; // the last settings seen, so the theme is right before the server answers

const cachedSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/** A list the rest of the app doesn't depend on: if the server can't give it (say it is a version behind), the
 * screens that need it are empty instead of the whole app failing to load. A server that can't be reached still fails. */
const optional = (path, fallback = []) => api(path).catch((err) => (unreachable(err) ? Promise.reject(err) : fallback));

const EMPTY = { sales: [], returns: [], stock: {}, orders: [], quotes: [], imports: [], stockReturns: [], boxes: [], invoices: [], closes: [] };

/** Puts `item` in `list` in place of the one with its id, or at the end. */
const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
const merge = (list, items) => items.reduce(upsert, list);
const byAt = (a, b) => new Date(a.at) - new Date(b.at);

/** Takes the bills in `pending` off `stock` at their showroom (the server's stock doesn't have them yet). */
const lessPending = (stock, pending) => {
  if (!pending.length) return stock;
  const next = { ...stock };
  for (const sale of pending) {
    const place = { ...next[sale.location] };
    for (const line of sale.lines) place[line.code] = (place[line.code] ?? 0) - line.qty;
    next[sale.location] = place;
  }
  return next;
};

export const StoreProvider = ({ session, children }) => {
  const [data, setData] = useState(EMPTY);
  const [settings, setSettings] = useState(cachedSettings);
  const [online, setOnline] = useState(true);
  const lastSync = useRef(null); // server time of the last full or partial sales fetch
  const fromCache = useRef(false); // opened on the records kept in this browser: load them all once it's back
  const loaded = useRef(false);
  const signedIn = Boolean(session);
  const admin = session?.role === 'admin';
  const key = offlineKey(session); // null for the admin: only a showroom counter bills offline
  const snapshotName = key && `store-${key}`;
  const outbox = useSyncExternalStore(subscribeOutbox, () => readOutbox(key));

  const keepSettings = useCallback((next) => {
    setSettings({ ...DEFAULT_SETTINGS, ...next });
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, []);

  // Before sign-in the sign-in screen still uses the admin's appearance settings (theme, snow). The provider is
  // made afresh for every sign-in (App keys it by login), so nothing of one login's records is left for the next.
  useEffect(() => {
    if (!signedIn) api('/settings').then(keepSettings, () => {});
  }, [signedIn, keepSettings]);

  const fetchAll = useCallback(async () => {
    const started = new Date();
    let results;
    try {
      results = await Promise.all([
        api('/sales'),
        api('/returns'),
        api('/stock'),
        api('/orders'),
        api('/quotes'),
        api('/stock/imports'),
        api('/purchase-returns'),
        admin ? optional('/boxes') : [],
        optional('/transfer-invoices'),
        api('/cash/closes'),
        api('/settings'),
      ]);
    } catch (err) {
      // the server can't be reached: a counter opens on what it kept last time
      const snapshot = snapshotName && unreachable(err) ? await kept(snapshotName) : undefined;
      if (!snapshot) throw err;
      setData({ ...EMPTY, ...snapshot });
      fromCache.current = true;
      loaded.current = true;
      setOnline(false);
      return;
    }
    const [sales, returns, stock, orders, quotes, imports, stockReturns, boxes, invoices, closes, s] = results;
    lastSync.current = started;
    fromCache.current = false;
    loaded.current = true;
    setOnline(true);
    setData({ sales, returns, stock, orders, quotes, imports, stockReturns, boxes, invoices, closes });
    keepSettings(s);
    if (key) ensureOfflineCounter(key).catch(() => {});
  }, [admin, keepSettings, key, snapshotName]);

  // A light refresh: new bills since the last one (with a minute of overlap), and the small lists whole.
  const refresh = useCallback(async () => {
    if (fromCache.current) return fetchAll().catch(() => {});
    if (!lastSync.current) return;
    const since = new Date(lastSync.current.getTime() - 60_000).toISOString();
    const started = new Date();
    try {
      const [sales, returns, stock, orders, stockReturns, boxes, invoices, closes] = await Promise.all([
        api(`/sales?since=${encodeURIComponent(since)}`),
        api(`/returns?since=${encodeURIComponent(since)}`),
        api('/stock'),
        api('/orders'),
        api('/purchase-returns'),
        admin ? optional('/boxes', null) : null,
        optional('/transfer-invoices', null),
        api('/cash/closes'),
      ]);
      lastSync.current = started;
      setOnline(true);
      setData((d) => ({
        ...d,
        sales: merge(d.sales, sales).sort(byAt),
        returns: merge(d.returns, returns).sort(byAt),
        stock,
        orders,
        stockReturns,
        boxes: boxes ?? d.boxes,
        invoices: invoices ?? d.invoices,
        closes,
      }));
    } catch (err) {
      // offline for a moment: try again next time
      if (unreachable(err)) setOnline(false);
    }
  }, [admin, fetchAll]);

  // What this counter keeps for opening offline: the records as the server last sent them.
  useEffect(() => {
    if (snapshotName && loaded.current && !fromCache.current) keep(snapshotName, data);
  }, [snapshotName, data]);

  const reloadStock = useCallback(async () => {
    const stock = await api('/stock');
    setData((d) => ({ ...d, stock }));
  }, []);

  // Sends the bills made offline, oldest first, and stops at the first that can't get through. One the server
  // turns down keeps its reason and stays in the outbox (shown on the counter), and is tried again next time.
  const sending = useRef(false);
  const sendOutbox = useCallback(async () => {
    if (!key || sending.current || !readOutbox(key).length) return;
    sending.current = true;
    let sent = false;
    try {
      for (const item of readOutbox(key)) {
        try {
          const sale = await api('/sales', { method: 'POST', body: item.body });
          setData((d) => ({ ...d, sales: upsert(d.sales, sale).sort(byAt) }));
          removeFromOutbox(key, item.body.id);
          sent = true;
        } catch (err) {
          if (unreachable(err)) setOnline(false);
          if (unreachable(err) || err.status === 401) break;
          markOutbox(key, item.body.id, err.message);
        }
      }
    } finally {
      sending.current = false;
    }
    if (sent) reloadStock().catch(() => {});
  }, [key, reloadStock]);

  useEffect(() => {
    if (online) sendOutbox();
  }, [online, sendOutbox]);

  useEffect(() => {
    if (!signedIn) return undefined;
    const tick = () => refresh().then(sendOutbox);
    const timer = setInterval(tick, REFRESH_MS);
    const onFocus = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', tick);
    };
  }, [signedIn, refresh, sendOutbox]);

  /** Stores a record the server sent back in one of the lists, and reloads stock when it changed. */
  const saved = useCallback(
    (key, record, { stock = false } = {}) => {
      setData((d) => ({ ...d, [key]: upsert(d[key], record) }));
      if (stock) reloadStock().catch(() => {});
      return record;
    },
    [reloadStock],
  );

  const value = useMemo(() => {
    // bills still in the outbox show as made, until the server has them
    const known = new Set(data.sales.map((s) => s.id));
    const pending = outbox.map((x) => x.sale).filter((s) => !known.has(s.id));
    const sales = pending.length ? [...data.sales, ...pending].sort(byAt) : data.sales;
    const stock = lessPending(data.stock, pending);
    return {
      ...data,
      sales,
      stock,
      settings,
      stockOf: (location, code) => stock[location]?.[code] ?? 0,

      /** Whether the server answered last time, how many bills made offline aren't on it yet, and those it
       *  turned down (each with the reason in `error`). */
      offline: { online, pending: outbox.length, failed: outbox.filter((x) => x.error) },

      /** Loads everything for the signed-in login (after sign-in, and on "Try again"). */
      load: fetchAll,

      /** A bill from the counter: { id, lines: [{ code, qty }], phone, name, payment }. The server prices it, numbers
       *  it and takes it off stock; resolves to the saved sale. Send the same id again to retry safely. When the
       *  server can't be reached, a showroom counter keeps it to send later and resolves to it with its offline
       *  number (offline: true). */
      recordSale: async (bill) => {
        try {
          const sale = await api('/sales', { method: 'POST', body: bill });
          setOnline(true);
          return saved('sales', sale, { stock: true });
        } catch (err) {
          if (!key || !unreachable(err)) throw err;
          setOnline(false);
          return queueOfflineSale(key, session, bill);
        }
      },

      /** A return or exchange: { id, saleId | billNo, lines, reason, exchange?: { id, lines, payment } }.
       *  Resolves to { creditNote, sale } (sale: the new bill of an exchange). */
      recordReturn: async (body) => {
        const result = await api('/returns', { method: 'POST', body });
        saved('returns', result.creditNote, { stock: true });
        if (result.original) saved('sales', result.original); // a credit bill's balance comes down
        if (result.sale) saved('sales', result.sale);
        return result;
      },

      /** A payment towards a credit bill's balance: { id, amount, payment }. Resolves to the bill as it is now
       *  (its balance and collections, the new one last). */
      collectBalance: async (saleId, body) => saved('sales', await api(`/sales/${saleId}/collections`, { method: 'POST', body })),

      /** A bill with what can still be returned from it: { sale, lines, returnableUntil, open }. */
      findBill: (billNo) => api(`/returns/bill?bill_no=${encodeURIComponent(billNo)}`),

      /** Purchase orders: a showroom's requests (see lib/orders.js). Each resolves to the order as saved. */
      requestOrder: async ({ location, lines, note }) =>
        saved('orders', await api('/orders', { method: 'POST', body: { location, lines, note } })),
      updateOrder: async (id, { lines, note }) => saved('orders', await api(`/orders/${id}`, { method: 'PUT', body: { lines, note } })),
      rejectOrder: async (id, note) => saved('orders', await api(`/orders/${id}/reject`, { method: 'POST', body: { note } })),
      cancelOrder: async (id) => saved('orders', await api(`/orders/${id}/cancel`, { method: 'POST' })),

      /** Stock from an Excel: { location?, file, source?, lines: [{ code, qty, rate? }] }; it is added to that
       *  showroom's stock. Resolves to the import as saved. */
      importStock: async (record) =>
        saved('imports', await api('/stock/imports', { method: 'POST', body: { id: newId(), ...record } }), { stock: true }),

      /** A showroom sends stock back to the admin: { lines: [{ code, qty }], reason, note }. It leaves stock now. */
      sendStockBack: async (body) =>
        saved('stockReturns', await api('/purchase-returns', { method: 'POST', body: { id: newId(), ...body } }), { stock: true }),
      /** The admin counts a purchase return in. */
      receiveStockBack: async (id, counted, note) =>
        saved('stockReturns', await api(`/purchase-returns/${id}/receive`, { method: 'POST', body: { counted, note } })),

      /** Boxes (admin): saves one or many ({ id, boxNo, stockNo, shipment, supplier, lines }; the same id edits a box
       *  still in the warehouse). They are added to the admin's own stock. */
      saveBoxes: async (boxes) => {
        const list = await api('/boxes', { method: 'POST', body: { boxes } });
        setData((d) => ({ ...d, boxes: merge(d.boxes, list) }));
        reloadStock().catch(() => {});
        return list;
      },
      deleteBox: async (id) => {
        await api(`/boxes/${id}`, { method: 'DELETE' });
        setData((d) => ({ ...d, boxes: d.boxes.filter((b) => b.id !== id) }));
        reloadStock().catch(() => {});
      },

      /** Transfer invoices (admin raises them; a showroom sees its own). Each resolves to the invoice as saved. */
      saveInvoice: async ({ location, boxIds, orderId, note }) => {
        const invoice = await api('/transfer-invoices', { method: 'POST', body: { id: newId(), location, boxIds, orderId, note } });
        const [boxes, orders] = await Promise.all([api('/boxes'), api('/orders')]);
        setData((d) => ({ ...d, boxes, orders, invoices: upsert(d.invoices, invoice) }));
        reloadStock().catch(() => {});
        return invoice;
      },
      /** The e-way bill / bill numbers, and optionally the bill's PDF (docName + docBase64). */
      saveInvoiceDocuments: async (id, body) => saved('invoices', await api(`/transfer-invoices/${id}/documents`, { method: 'PUT', body })),
      payInvoice: async (id, { ref, note }) => saved('invoices', await api(`/transfer-invoices/${id}/pay`, { method: 'POST', body: { ref, note } })),
      /** Adds a paid invoice's products to the showroom's stock. */
      stockInvoice: async (id) => {
        const invoice = await api(`/transfer-invoices/${id}/stock`, { method: 'POST' });
        setData((d) => ({ ...d, boxes: d.boxes.map((b) => (invoice.boxIds.includes(b.id) ? { ...b, status: 'stocked' } : b)) }));
        return saved('invoices', invoice, { stock: true });
      },
      /** Cancels an invoice not yet stocked: its boxes go back to the warehouse. */
      cancelInvoice: async (id) => {
        const invoice = await api(`/transfer-invoices/${id}/cancel`, { method: 'POST' });
        const [boxes, orders] = await Promise.all([api('/boxes'), api('/orders')]);
        setData((d) => ({ ...d, boxes, orders, invoices: upsert(d.invoices, invoice) }));
        reloadStock().catch(() => {});
        return invoice;
      },
      /** The invoice's uploaded bill as a PDF file. */
      downloadInvoiceDocument: (invoice) => download(`/transfer-invoices/${invoice.id}/document`, invoice.docName || `${invoice.number}.pdf`),

      /** A quotation: { id, lines, name, phone, validDays, note }. Resolves to it with its number. */
      saveQuote: async (quote) => saved('quotes', await api('/quotes', { method: 'POST', body: quote })),
      /** Archives a quotation — it is never edited or deleted, only archived (kept) and brought back. */
      archiveQuote: async (id) => saved('quotes', await api(`/quotes/${id}/archive`, { method: 'POST' })),
      unarchiveQuote: async (id) => saved('quotes', await api(`/quotes/${id}/unarchive`, { method: 'POST' })),

      /** The day's cash so far for a showroom (the admin names it), and closing the day with the count. */
      cashDay: (location, day) => {
        const q = new URLSearchParams({ ...(location ? { location } : {}), ...(day ? { day } : {}) });
        return api(`/cash/day?${q}`);
      },
      closeDay: async (body) => saved('closes', await api('/cash/closes', { method: 'POST', body })),

      /** Reopens a cash close made by mistake, drops it from the list, and resolves to the day (now open). */
      reopenDay: async (id) => {
        const day = await api(`/cash/closes/${id}`, { method: 'DELETE' });
        setData((d) => ({ ...d, closes: d.closes.filter((c) => c.id !== id) }));
        return day;
      },

      /** The sales report as an Excel file: { location?, since?, until? } (dates as YYYY-MM-DD). */
      downloadSalesReport: ({ location, since, until } = {}) => {
        const q = new URLSearchParams({ ...(location ? { location } : {}), ...(since ? { since } : {}), ...(until ? { until } : {}) });
        return download(`/reports/sales.xlsx?${q}`, 'sales-report.xlsx');
      },

      /** Admin: the final (net) sales register as an Excel file, same options as the sales report. */
      downloadFinalSales: ({ location, since, until } = {}) => {
        const q = new URLSearchParams({ ...(location ? { location } : {}), ...(since ? { since } : {}), ...(until ? { until } : {}) });
        return download(`/reports/final-sales.xlsx?${q}`, 'final-sales.xlsx');
      },

      /** Changes one of the admin's settings: shown straight away, put back if the server refuses. */
      setSetting: async (key, next) => {
        const before = settings;
        setSettings({ ...settings, [key]: next });
        try {
          keepSettings(await api('/settings', { method: 'PATCH', body: { [key]: next } }));
        } catch (e) {
          setSettings(before);
          throw e;
        }
      },

      /** Demo admin: builds the demo's sample data again from scratch, then reloads it. */
      resetDemo: async () => {
        const result = await api('/demo/reset', { method: 'POST' });
        await fetchAll();
        return result.detail;
      },
    };
  }, [data, outbox, online, key, session, settings, fetchAll, saved, keepSettings, reloadStock]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
