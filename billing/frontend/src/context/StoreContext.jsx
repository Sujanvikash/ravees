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
 *           by the showroom, which is the only thing that adds stock.
 */
const StoreContext = createContext(null);

const adjust = (stock, location, lines, sign) => {
  const shop = { ...(stock[location] ?? {}) };
  for (const l of lines) shop[l.code] = (shop[l.code] ?? 0) + sign * l.qty;
  return { ...stock, [location]: shop };
};

export const StoreProvider = ({ children }) => {
  const [sales, setSales] = useLocalStorage('billing-sales', []);
  const [stock, setStock] = useLocalStorage('billing-stock', {});
  const [orders, setOrders] = useLocalStorage('billing-orders', []);

  const value = {
    sales,
    stock,
    orders,
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
