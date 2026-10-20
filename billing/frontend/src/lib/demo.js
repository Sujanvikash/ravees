import { LOCATIONS } from '../config.js';
import { PRODUCTS } from './catalogue.js';
import { billNumber, buildBill } from './bill.js';

/**
 * SAMPLE SALES for previewing the dashboards before real bills exist. Every one is flagged `demo: true`,
 * leaves stock alone, and "Remove demo sales" deletes them. Bill numbers start at 90001 so they can never
 * be mistaken for, or collide with, a showroom's real numbers.
 */
const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// A small seeded generator, so the sample looks the same every time it is added.
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const makeDemoSales = (days = 30, now = new Date()) => {
  const rand = seeded(2026);
  const season = PRODUCTS.filter((p) => p.inSeason);
  const pool = season.length ? season : PRODUCTS.slice(0, 200);
  const weight = { chennai: 1.4, bengaluru: 1.1, mumbai: 1.2, pune: 0.8, goa: 0.6 };
  const methods = ['cash', 'cash', 'upi', 'upi', 'upi', 'card'];
  const sales = [];
  const seq = Object.fromEntries(LOCATIONS.map((l) => [l.id, 90001]));

  for (let d = days - 1; d >= 0; d--) {
    // Busier towards Christmas: later days get more bills.
    const rush = 1 + (days - d) / days;
    for (const l of LOCATIONS) {
      const bills = Math.round((2 + rand() * 4) * weight[l.id] * rush);
      for (let b = 0; b < bills; b++) {
        const at = new Date(now);
        at.setDate(at.getDate() - d);
        at.setHours(10 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
        if (at > now) continue;
        const items = [];
        const count = 1 + Math.floor(rand() * 4);
        for (let i = 0; i < count; i++) {
          const p = pick(pool, rand);
          if (!items.some((it) => it.code === p.code)) items.push({ code: p.code, qty: 1 + Math.floor(rand() * 3) });
        }
        const bill = buildBill(items);
        const method = pick(methods, rand);
        sales.push({
          demo: true,
          location: l.id,
          billNo: billNumber(l.billPrefix, seq[l.id]++, at),
          at: at.toISOString(),
          phone: '',
          name: 'Demo customer',
          customer: 'Demo customer',
          lines: bill.lines.map((ln) => ({
            code: ln.code,
            name: ln.product.name,
            qty: ln.qty,
            price: ln.price,
            mrp: ln.product.mrp,
            cost: ln.product.cost,
          })),
          totals: {
            count: bill.count,
            qty: bill.qty,
            mrpTotal: bill.mrpTotal,
            savings: bill.savings,
            taxable: bill.taxable,
            tax: bill.tax,
            gstRows: bill.gstRows,
            roundOff: bill.roundOff,
            payable: bill.payable,
          },
          payment: { method, received: bill.payable, change: 0, approval: '', split: null, print: false },
        });
      }
    }
  }
  return sales.sort((a, b) => new Date(a.at) - new Date(b.at));
};
