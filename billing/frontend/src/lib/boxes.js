import { findProduct } from './catalogue.js';

/**
 * Packing lists: the boxes a supplier packed, each with the products inside, as one Excel sheet with a row per
 * product. The header row is found by name: it needs "Box No", "Code" and "Qty" columns; "Stock No", "Shipment"
 * (or Batch) and "Supplier" are optional. A box's number and details can be on its first row only: blank cells
 * below take the box above, as a printed packing list does. (A Showroom column in an older sheet is ignored: the
 * showroom is chosen when the box goes on a transfer invoice.)
 *
 * Returns { boxes: [{ boxNo, stockNo, shipment, supplier, lines: [{ code, name, qty }], rows }],
 * problems: [{ row, box, code, reason }], error }.
 */
const norm = (v) => String(v ?? '').trim().toLowerCase();
const text = (v) => String(v ?? '').trim();

const findColumn = (header, patterns) => header.findIndex((h) => patterns.some((p) => p.test(norm(h))));

const COLUMNS = {
  box: [/^box\.?( ?no\.?| ?number| ?id)?$/, /^carton( ?no\.?| ?number)?$/],
  code: [/^(item |product )?code$/],
  qty: [/^qty\.?$/, /^quantity$/],
  stock: [/^stock\.?( ?no\.?| ?number)$/],
  shipment: [/^(shipment|batch|lot|consignment)( ?no\.?| ?name)?$/],
  supplier: [/^(supplier|vendor|from)$/],
};

export const parseBoxRows = (rows) => {
  const headerIndex = rows.findIndex(
    (r) => findColumn(r, COLUMNS.box) >= 0 && findColumn(r, COLUMNS.code) >= 0 && findColumn(r, COLUMNS.qty) >= 0,
  );
  if (headerIndex < 0) {
    return { boxes: [], problems: [], error: 'Could not find the header row: the sheet needs "Box No", "Code" and "Qty" columns.' };
  }
  const header = rows[headerIndex];
  const col = Object.fromEntries(Object.entries(COLUMNS).map(([k, p]) => [k, findColumn(header, p)]));
  const cell = (r, k) => (col[k] >= 0 ? text(r[col[k]]) : '');

  const boxes = new Map();
  const problems = [];
  let current = null;
  rows.slice(headerIndex + 1).forEach((r, i) => {
    const excelRow = headerIndex + i + 2; // 1-based, as Excel shows it
    const boxNo = cell(r, 'box').toUpperCase();
    const code = cell(r, 'code');
    const rawQty = col.qty >= 0 ? r[col.qty] : '';
    if (!boxNo && !code && (rawQty === null || rawQty === undefined || rawQty === '')) return; // blank row

    if (boxNo) {
      current = boxes.get(boxNo);
      if (!current) {
        current = { boxNo, stockNo: '', shipment: '', supplier: '', lines: new Map(), rows: [] };
        boxes.set(boxNo, current);
      }
    }
    if (!current) return problems.push({ row: excelRow, box: '', code, reason: 'No box number above this row' });
    // box details can be on any of its rows; the first one given is kept
    for (const k of ['stockNo', 'shipment', 'supplier']) {
      const v = cell(r, { stockNo: 'stock', shipment: 'shipment', supplier: 'supplier' }[k]);
      if (v && !current[k]) current[k] = k === 'stockNo' ? v.toUpperCase() : v;
    }
    current.rows.push(excelRow);
    if (!code && (rawQty === null || rawQty === undefined || rawQty === '')) return; // a box's header row

    const product = findProduct(code);
    const qty = Number(rawQty);
    if (!code) return problems.push({ row: excelRow, box: current.boxNo, code, reason: 'No product code' });
    if (!product) return problems.push({ row: excelRow, box: current.boxNo, code, reason: 'Code not in the product list' });
    if (!Number.isInteger(qty) || qty <= 0) {
      return problems.push({ row: excelRow, box: current.boxNo, code, reason: `Quantity "${rawQty ?? ''}" is not a whole number above 0` });
    }
    const prev = current.lines.get(product.code);
    current.lines.set(product.code, { code: product.code, name: product.name, qty: (prev?.qty ?? 0) + qty });
  });

  const list = [...boxes.values()].map((b) => ({ ...b, lines: [...b.lines.values()] }));
  for (const b of list) {
    if (!b.lines.length) problems.push({ row: b.rows[0], box: b.boxNo, code: '', reason: 'No products: box skipped' });
  }
  return { boxes: list.filter((b) => b.lines.length), problems, error: null };
};

export const boxUnits = (lines) => lines.reduce((s, l) => s + l.qty, 0);

/** A scanned or typed box label: its box number or stock number, in any case and with stray spaces. */
export const findBox = (boxes, code) => {
  const k = String(code).trim().toUpperCase().replace(/\s+/g, '');
  if (!k) return undefined;
  return boxes.find((b) => b.boxNo.replace(/\s+/g, '') === k) ?? boxes.find((b) => b.stockNo && b.stockNo.replace(/\s+/g, '') === k);
};
