import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, download } from '../lib/api.js';
import { newId } from '../lib/uid.js';

/**
 * Sales, returns, stock, purchase orders, quotations, stock sent back, cash closes and the admin's settings, from
 * the billing API (billing/backend). They are loaded once after sign-in (load), then kept fresh every 30 seconds
 * and when the window comes back into focus, so the admin sees the showrooms' bills as they happen. Every change
 * goes to the server first; what it saves (with its bill or order number) is what shows here.
 *
 * A showroom gets only its own records; the admin every showroom's. A demo sign-in gets the demo's records.
 *
 *   sales    [{ id, billNo, at, location, phone, name, customer, lines: [{ code, name, qty, price, mrp, cost, gst }],
 *              totals, payment }]
 *   returns  credit notes: [{ id, returnNo, saleId, billNo, location, at, kind: return | exchange, lines, amount,
 *              refund, exchangeBillNo }]
 *   stock    { [location]: { [code]: qty } }     (can go negative if billed beyond what was counted in)
 *   orders   purchase orders, see lib/orders.js: requested by a showroom → sent by the admin → counted in
 *   quotes   quotations: priced lists for a customer, never a bill
 *   imports  stock added straight from an Excel: [{ id, at, by, username, location, file, lines, source? }]
 *   stockReturns  stock a showroom sent back to the admin: [{ id, number, location, status: sent | received, … }]
 *   closes   daily cash closes: [{ location, day, expected, counted, difference, … }]
 *   settings the admin's switches: see DEFAULT_SETTINGS
 */
const StoreContext = createContext(null);

/** quotePrint: showrooms may print quotations. theme: classic | light | dark; wash (Light): light | lighter |
 *  lightest; effect: none | snow | glow | both; snow: light | medium | heavy | blizzard; effectWhere: everywhere |
 *  signin; strip (Light): green | white; nav: solid | soft; returnDays: 0 (off) | 7 | 15 | 30. */
export const DEFAULT_SETTINGS = {
  quotePrint: true,
  theme: 'classic',
  wash: 'lighter',
  effect: 'none',
  snow: 'light',
  effectWhere: 'everywhere',
  strip: 'green',
  nav: 'solid',
  returnDays: 15,
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

const EMPTY = { sales: [], returns: [], stock: {}, orders: [], quotes: [], imports: [], stockReturns: [], closes: [] };

/** Puts `item` in `list` in place of the one with its id, or at the end. */
const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
const merge = (list, items) => items.reduce(upsert, list);
const byAt = (a, b) => new Date(a.at) - new Date(b.at);

export const StoreProvider = ({ session, children }) => {
  const [data, setData] = useState(EMPTY);
  const [settings, setSettings] = useState(cachedSettings);
  const lastSync = useRef(null); // server time of the last full or partial sales fetch
  const signedIn = Boolean(session);

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
    const [sales, returns, stock, orders, quotes, imports, stockReturns, closes, s] = await Promise.all([
      api('/sales'),
      api('/returns'),
      api('/stock'),
      api('/orders'),
      api('/quotes'),
      api('/stock/imports'),
      api('/stock-returns'),
      api('/cash/closes'),
      api('/settings'),
    ]);
    lastSync.current = started;
    setData({ sales, returns, stock, orders, quotes, imports, stockReturns, closes });
    keepSettings(s);
  }, [keepSettings]);

  // A light refresh: new bills since the last one (with a minute of overlap), and the small lists whole.
  const refresh = useCallback(async () => {
    if (!lastSync.current) return;
    const since = new Date(lastSync.current.getTime() - 60_000).toISOString();
    const started = new Date();
    try {
      const [sales, returns, stock, orders, stockReturns, closes] = await Promise.all([
        api(`/sales?since=${encodeURIComponent(since)}`),
        api(`/returns?since=${encodeURIComponent(since)}`),
        api('/stock'),
        api('/orders'),
        api('/stock-returns'),
        api('/cash/closes'),
      ]);
      lastSync.current = started;
      setData((d) => ({
        ...d,
        sales: merge(d.sales, sales).sort(byAt),
        returns: merge(d.returns, returns).sort(byAt),
        stock,
        orders,
        stockReturns,
        closes,
      }));
    } catch {
      // offline for a moment: try again next time
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return undefined;
    const timer = setInterval(refresh, REFRESH_MS);
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [signedIn, refresh]);

  const reloadStock = useCallback(async () => {
    const stock = await api('/stock');
    setData((d) => ({ ...d, stock }));
  }, []);

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
    const { stock } = data;
    return {
      ...data,
      settings,
      stockOf: (location, code) => stock[location]?.[code] ?? 0,

      /** Loads everything for the signed-in login (after sign-in, and on "Try again"). */
      load: fetchAll,

      /** A bill from the counter: { id, lines: [{ code, qty }], phone, name, payment }. The server prices it, numbers
       *  it and takes it off stock; resolves to the saved sale. Send the same id again to retry safely. */
      recordSale: async (bill) => saved('sales', await api('/sales', { method: 'POST', body: bill }), { stock: true }),

      /** A return or exchange: { id, saleId | billNo, lines, reason, exchange?: { id, lines, payment } }.
       *  Resolves to { creditNote, sale } (sale: the new bill of an exchange). */
      recordReturn: async (body) => {
        const result = await api('/returns', { method: 'POST', body });
        saved('returns', result.creditNote, { stock: true });
        if (result.sale) saved('sales', result.sale);
        return result;
      },

      /** A bill with what can still be returned from it: { sale, lines, returnableUntil, open }. */
      findBill: (billNo) => api(`/returns/bill?bill_no=${encodeURIComponent(billNo)}`),

      /** Purchase orders, step by step (see lib/orders.js). Each resolves to the order as saved. */
      requestOrder: async ({ location, lines, note }) =>
        saved('orders', await api('/orders', { method: 'POST', body: { location, lines, note } })),
      updateOrder: async (id, { lines, note }) => saved('orders', await api(`/orders/${id}`, { method: 'PUT', body: { lines, note } })),
      sendOrder: async (id, { lines, note }) => saved('orders', await api(`/orders/${id}/send`, { method: 'POST', body: { lines, note } })),
      rejectOrder: async (id, note) => saved('orders', await api(`/orders/${id}/reject`, { method: 'POST', body: { note } })),
      cancelOrder: async (id) => saved('orders', await api(`/orders/${id}/cancel`, { method: 'POST' })),
      receiveOrder: async (id, counted, note) =>
        saved('orders', await api(`/orders/${id}/receive`, { method: 'POST', body: { counted, note } }), { stock: true }),

      /** Stock from an Excel: { location?, file, source?, lines: [{ code, qty, rate? }] }; it is added to that
       *  showroom's stock. Resolves to the import as saved. */
      importStock: async (record) =>
        saved('imports', await api('/stock/imports', { method: 'POST', body: { id: newId(), ...record } }), { stock: true }),

      /** A showroom sends stock back to the admin: { lines: [{ code, qty }], reason, note }. It leaves stock now. */
      sendStockBack: async (body) =>
        saved('stockReturns', await api('/stock-returns', { method: 'POST', body: { id: newId(), ...body } }), { stock: true }),
      /** The admin counts a stock return in. */
      receiveStockBack: async (id, counted, note) =>
        saved('stockReturns', await api(`/stock-returns/${id}/receive`, { method: 'POST', body: { counted, note } })),

      /** A quotation: { id, lines, name, phone, validDays, note }. Resolves to it with its number. */
      saveQuote: async (quote) => saved('quotes', await api('/quotes', { method: 'POST', body: quote })),

      /** The day's cash so far for a showroom (the admin names it), and closing the day with the count. */
      cashDay: (location, day) => {
        const q = new URLSearchParams({ ...(location ? { location } : {}), ...(day ? { day } : {}) });
        return api(`/cash/day?${q}`);
      },
      closeDay: async (body) => saved('closes', await api('/cash/closes', { method: 'POST', body })),

      /** The sales report as an Excel file: { location?, since?, until? } (dates as YYYY-MM-DD). */
      downloadSalesReport: ({ location, since, until } = {}) => {
        const q = new URLSearchParams({ ...(location ? { location } : {}), ...(since ? { since } : {}), ...(until ? { until } : {}) });
        return download(`/reports/sales.xlsx?${q}`, 'sales-report.xlsx');
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
  }, [data, settings, fetchAll, saved, keepSettings]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
