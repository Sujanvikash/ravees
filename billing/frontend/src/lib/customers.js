/**
 * Customers, from the bills: every bill carries the customer's name and mobile, so a customer is one mobile number.
 * Their name is the one on their latest bill. Spending is net of what they brought back (returns, and the returned
 * half of exchanges).
 *
 * → [{ phone, name, bills, spent, returned, net, first, last, showrooms: [ids], sales: [sale], returns: [ret] }]
 */
export const customersFrom = (sales, returns) => {
  const byPhone = new Map();
  for (const s of sales) {
    if (!s.phone) continue;
    let c = byPhone.get(s.phone);
    if (!c) {
      c = { phone: s.phone, name: s.name, bills: 0, spent: 0, returned: 0, first: s.at, last: s.at, showrooms: new Set(), sales: [], returns: [] };
      byPhone.set(s.phone, c);
    }
    c.bills += 1;
    c.spent += s.totals.payable;
    c.showrooms.add(s.location);
    c.sales.push(s);
    if (s.at < c.first) c.first = s.at;
    if (s.at >= c.last) {
      c.last = s.at;
      if (s.name) c.name = s.name;
    }
  }
  for (const r of returns) {
    const c = byPhone.get(r.phone);
    if (!c) continue;
    c.returned += r.amount;
    c.returns.push(r);
  }
  return [...byPhone.values()].map((c) => ({ ...c, net: c.spent - c.returned, showrooms: [...c.showrooms] }));
};
