import { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

/**
 * Sales, stock and purchase orders for all five showrooms. There is no billing backend yet, so they live
 * in this browser's localStorage: the admin only sees what was done on the same computer. Everything that
 * reads or changes them goes through this provider, so the backend can replace it with API calls without
 * touching the screens.
 *
 *   sales   [{ billNo, at, location, lines: [{ code, name, qty, price, mrp, cost }], totals, payment, … }]
 *   stock   { [location]: { [code]: qty } }     (can go negative if billed beyond what was counted in)
 *   orders  purchase orders, see lib/orders.js: requested by a showroom → sent by the admin → counted in
 *           by the showroom, which adds the counted stock.
 *   quotes  quotations: priced lists for a customer, never a bill; they don't touch stock or sales.
 *           [{ quoteNo, at, location, by, name, phone, validUntil, note, lines, totals }]
 *   settings  the admin's switches: see DEFAULT_SETTINGS
 *   imports stock added straight from an Excel (opening stock, goods that came outside an order):
 *           [{ id, at, by, username, location, file, lines: [{ code, name, qty, rate }], source? }]
 *           (source 'new-product': the opening stock entered with a showroom's own new product)
 */
const StoreContext = createContext(null);

/** quotePrint: showrooms may print quotations. theme: classic | light | dark; wash (Light): light | lighter |
 *  lightest; effect: none | snow | glow | both; snow: light | medium | heavy | blizzard; effectWhere: everywhere |
 *  signin; strip (Light): green | white; nav: solid | soft. */
export const DEFAULT_SETTINGS = {
  quotePrint: true,
  theme: 'classic',
  wash: 'lighter',
  effect: 'none',
  snow: 'light',
  effectWhere: 'everywhere',
  strip: 'green',
  nav: 'solid',
};

const adjust = (stock, location, lines, sign) => {
  const shop = { ...(stock[location] ?? {}) };
  for (const l of lines) shop[l.code] = (shop[l.code] ?? 0) + sign * l.qty;
  return { ...stock, [location]: shop };
};

export const StoreProvider = ({ children }) => {
  const [sales, setSales] = useLocalStorage('billing-sales', []);
  const [stock, setStock] = useLocalStorage('billing-stock', {});
  const [orders, setOrders] = useLocalStorage('billing-orders', []);
  const [imports, setImports] = useLocalStorage('billing-stock-imports', []);
  const [quotes, setQuotes] = useLocalStorage('billing-quotes', []);
  const [settings, setSettings] = useLocalStorage('billing-settings', { quotePrint: true });

  const value = {
    sales,
    stock,
    orders,
    imports,
    quotes,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    stockOf: (location, code) => stock[location]?.[code] ?? 0,

    /** A completed sale: logged, and its items come off that showroom's stock (demo sales don't). */
    recordSale: (sale) => {
      setSales((prev) => [...prev, sale]);
      if (!sale.demo) setStock((prev) => adjust(prev, sale.location, sale.lines, -1));
    },

    /** Creates or updates a purchase order (matched by id). */
    saveOrder: (order) =>
      setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev.map((o) => (o.id === order.id ? order : o)) : [...prev, order])),

    /** The showroom has counted a sent order in: the counted quantities are added to its stock. */
    receiveOrder: (order, counted) => {
      setStock((prev) => adjust(prev, order.location, counted, +1));
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    },

    /** Stock imported from an Excel: kept as a record, and its quantities are added to that showroom's stock. */
    importStock: (record) => {
      setStock((prev) => adjust(prev, record.location, record.lines, +1));
      setImports((prev) => [...prev, record]);
    },

    /** A saved quotation (never a sale: no stock change, not in the sales figures). */
    saveQuote: (quote) => setQuotes((prev) => [...prev, quote]),

    /** Changes one of the admin's settings. */
    setSetting: (key, value) => setSettings((prev) => ({ ...prev, [key]: value })),

    /** Sample sales so the admin dashboards have something to show; they are flagged and removable. */
    addDemoSales: (list) => setSales((prev) => [...prev, ...list]),
    removeDemoSales: () => setSales((prev) => prev.filter((s) => !s.demo)),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
