import { findProduct } from './catalogue.js';

/**
 * Reads the rows of a purchase Excel (as read-excel-file returns them: an array of rows, each an array of
 * cells) into purchase lines. The header row is found by name, so a title row above it, extra columns or
 * a different column order are fine: it needs a "Code" column and a "Qty"/"Quantity" column; "Rate",
 * "Purchase rate" or "Cost" is optional (the product's cost price is used when it is blank).
 *
 * Returns { lines, problems, header }: lines are the rows to add (same code twice is summed), problems
 * the rows that were skipped and why.
 */
const norm = (v) => String(v ?? '').trim().toLowerCase();

const findColumn = (header, patterns) => header.findIndex((h) => patterns.some((p) => p.test(norm(h))));

export const parsePurchaseRows = (rows) => {
  const headerIndex = rows.findIndex(
    (r) => findColumn(r, [/^(item |product )?code$/]) >= 0 && findColumn(r, [/^qty$/, /^quantity$/, /^qty\.?$/]) >= 0,
  );
  if (headerIndex < 0) {
    return { lines: [], problems: [], header: null, error: 'Could not find the header row: the sheet needs a "Code" and a "Qty" column.' };
  }
  const header = rows[headerIndex];
  const col = {
    code: findColumn(header, [/^(item |product )?code$/]),
    qty: findColumn(header, [/^qty\.?$/, /^quantity$/]),
    rate: findColumn(header, [/^(purchase )?rate$/, /^cost( price)?$/, /^unit (cost|price)$/]),
  };

  const merged = new Map();
  const problems = [];
  rows.slice(headerIndex + 1).forEach((r, i) => {
    const excelRow = headerIndex + i + 2; // 1-based, as Excel shows it
    const code = String(r[col.code] ?? '').trim();
    const rawQty = r[col.qty];
    if (!code && (rawQty === null || rawQty === undefined || rawQty === '')) return; // blank row
    const product = findProduct(code);
    const qty = Number(rawQty);
    const rate = col.rate >= 0 && r[col.rate] !== null && r[col.rate] !== '' ? Number(r[col.rate]) : null;

    if (!code) return problems.push({ row: excelRow, code, reason: 'No product code' });
    if (!product) return problems.push({ row: excelRow, code, reason: 'Code not in the product list' });
    if (!Number.isInteger(qty) || qty <= 0) return problems.push({ row: excelRow, code, reason: `Quantity "${rawQty ?? ''}" is not a whole number above 0` });
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) return problems.push({ row: excelRow, code, reason: `Rate "${r[col.rate]}" is not a number` });

    const prev = merged.get(product.code);
    const unit = rate ?? product.cost ?? 0;
    if (prev) {
      // Same code twice: add the quantities and keep a weighted average rate.
      const total = prev.qty + qty;
      merged.set(product.code, { ...prev, qty: total, rate: (prev.rate * prev.qty + unit * qty) / total, rows: [...prev.rows, excelRow] });
    } else {
      merged.set(product.code, { code: product.code, name: product.name, dept: product.dept, qty, rate: unit, rateFromFile: rate !== null, rows: [excelRow] });
    }
  });

  return { lines: [...merged.values()], problems, header: col, error: null };
};
