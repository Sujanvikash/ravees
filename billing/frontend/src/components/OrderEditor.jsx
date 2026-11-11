import { useMemo, useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { CircleAlert, FileSpreadsheet, FileText, Minus, Plus, Save, Search, Send, Sparkles, X } from 'lucide-react';
import { locationById, WAREHOUSE } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { findProduct, PRODUCTS, searchProducts } from '../lib/catalogue.js';
import { inr } from '../lib/money.js';
import { orderQty, orderValue } from '../lib/orders.js';
import { parsePurchaseRows } from '../lib/purchaseFile.js';
import Dialog from './Dialog.jsx';

const LOW = 5; // matches Inventory's low-stock line
const RESTOCK_TO = 10; // "Add low stock" suggests topping each item up to this many units

/**
 * A showroom's stock request (quantities only; the admin fulfils it with an invoice). Lines can be picked from the product list
 * (shown as soon as the search box is clicked: this season's products, lowest stock first), searched,
 * suggested from low stock, or imported from a purchase Excel.
 * `review`: the admin checks a showroom's request before answering it, against the admin stock as well, and saves it
 * or goes on to raise its invoice with these lines (onSave gets `raise`).
 */
const OrderEditor = ({ order, review = false, onClose, onSave }) => {
  const { stockOf } = useStore();
  const location = order.location;
  const [lines, setLines] = useState(order.lines);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false); // search box focused: show the product list
  const [importInfo, setImportInfo] = useState(null);
  const fileRef = useRef(null);
  const shop = locationById(location);
  const existing = Boolean(order.number);

  // A showroom's own added products (p.shop) aren't supplied by the admin, so they can't be ordered: only the
  // admin's catalogue is offered here.
  const matches = useMemo(() => searchProducts(query, { limit: 12 }).filter((p) => !p.shop).slice(0, 6), [query]);
  // Before anything is typed: this season's products not on the order yet, lowest stock first.
  const browse = useMemo(
    () =>
      PRODUCTS.filter((p) => p.inSeason && !p.shop && !lines.some((l) => l.code === p.code))
        .map((p) => ({ p, stock: stockOf(location, p.code) }))
        .sort((a, b) => a.stock - b.stock || a.p.name.localeCompare(b.p.name)),
    [lines, location, stockOf],
  );
  const list = query.trim() ? matches.map((p) => ({ p, stock: stockOf(location, p.code) })) : browsing ? browse : [];

  const addLines = (incoming) =>
    setLines((prev) => {
      const next = [...prev];
      for (const l of incoming) {
        const i = next.findIndex((x) => x.code === l.code);
        if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + l.qty };
        else next.push(l);
      }
      return next;
    });

  const lineFor = (product, qty = 1, rate) => ({ code: product.code, name: product.name, qty, rate: rate ?? product.cost ?? 0 });

  const lowStock = PRODUCTS.filter((p) => p.inSeason && !p.shop && stockOf(location, p.code) <= LOW && !lines.some((l) => l.code === p.code));

  const importFile = async (f) => {
    if (!f) return;
    try {
      const parsed = parsePurchaseRows(await readSheet(f));
      if (parsed.error) return setImportInfo({ error: parsed.error });
      addLines(parsed.lines.map((l) => ({ code: l.code, name: l.name, qty: l.qty, rate: l.rate })));
      setImportInfo({ name: f.name, added: parsed.lines.length, problems: parsed.problems });
    } catch {
      setImportInfo({ error: `${f.name} could not be read as an .xlsx sheet.` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const adminStock = (code) => stockOf(WAREHOUSE.id, code);
  const short = review ? lines.filter((l) => l.qty > adminStock(l.code)) : [];

  const setQty = (code, qty) => setLines((prev) => (qty > 0 ? prev.map((l) => (l.code === code ? { ...l, qty } : l)) : prev.filter((l) => l.code !== code)));

  const title = review ? `Review ${order.number} from ${shop.city}` : existing ? `Edit request ${order.number}` : 'Request stock';
  const subtitle = review
    ? 'Change the quantities, remove or add products, then raise the invoice: it starts with the products as reviewed here.'
    : 'The admin reviews your request and sends the stock with an invoice.';
  const action = existing ? 'Update request' : 'Send request to admin';

  return (
    <Dialog id="order" title={title} subtitle={subtitle} onClose={onClose} size="max-w-4xl">
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="relative min-w-64 flex-1">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]">
              <Search size={15} className="text-ink-3" aria-hidden="true" />
              <span className="sr-only">Add a product</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setBrowsing(true)}
                onBlur={() => setBrowsing(false)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const p = findProduct(query) ?? matches[0];
                  if (p && !p.shop) {
                    addLines([lineFor(p)]);
                    setQuery('');
                  }
                }}
                placeholder="Add a product: scan, or search by code or name"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-ink-3"
              />
            </label>
            {list.length > 0 && (
              <ul className="absolute inset-x-0 top-11 z-10 max-h-80 animate-pop overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_-8px_rgba(9,9,11,0.18)]">
                {!query.trim() && (
                  <li className="px-3 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                    Season products at {shop.city} · lowest stock first
                  </li>
                )}
                {list.map(({ p, stock }) => (
                  <li key={p.code}>
                    <button
                      type="button"
                      // keep the search box focused, so the list stays open for the next product
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        addLines([lineFor(p)]);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-mist"
                    >
                      <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-xs text-ink-2 tabular-nums">{inr(p.cost ?? 0)}</span>
                      <span className={`w-20 text-right text-xs tabular-nums ${stock <= 0 ? 'text-ruby-ink' : stock <= LOW ? 'text-warn-ink' : 'text-ink-3'}`}>
                        {review ? `${stock} at ${shop.city}` : `${stock} in stock`}
                      </span>
                      {review && <span className="w-24 text-right text-xs text-ink-3 tabular-nums">{adminStock(p.code)} with admin</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => addLines(lowStock.map((p) => lineFor(p, Math.max(RESTOCK_TO - Math.max(stockOf(location, p.code), 0), 1))))}
            disabled={!lowStock.length}
            title={`Season products at ${shop.city} with ${LOW} or fewer units, topped up to ${RESTOCK_TO}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] font-medium text-ink-2 enabled:hover:bg-mist enabled:hover:text-ink disabled:opacity-40"
          >
            <Sparkles size={15} aria-hidden="true" /> Add low stock ({lowStock.length})
          </button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            <FileSpreadsheet size={15} aria-hidden="true" /> Import Excel
            <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => importFile(e.target.files[0])} />
          </label>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-ink-3">
          <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
          Only products from the admin&rsquo;s catalogue can be ordered. A showroom&rsquo;s own added products are not supplied by the admin and are not listed here.
        </p>

        {importInfo && (
          <div
            role="status"
            className={`flex animate-pop items-start gap-2 rounded-xl px-4 py-2.5 text-[13px] ${importInfo.error || importInfo.problems?.length ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              {importInfo.error ?? `Imported ${importInfo.added} products from ${importInfo.name}.`}
              {importInfo.problems?.length > 0 && (
                <span>
                  {' '}
                  Skipped {importInfo.problems.length}:{' '}
                  {importInfo.problems
                    .slice(0, 4)
                    .map((p) => `row ${p.row} ${p.code ? `(${p.code}) ` : ''}${p.reason.toLowerCase()}`)
                    .join('; ')}
                  {importInfo.problems.length > 4 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="max-h-[42vh] min-h-40 overflow-auto rounded-xl border border-line-soft">
          {lines.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-ink-3">No products yet: search above, add low stock, or import an Excel.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-[13px] tabular-nums">
              <thead className="sticky top-0 z-1 bg-mist-2 text-left text-xs text-ink-3">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{review ? `At ${shop.city}` : 'In stock'}</th>
                  {review && <th scope="col" className="px-3 py-2 text-right font-medium">Admin stock</th>}
                  <th scope="col" className="px-3 py-2 text-center font-medium">Qty</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Rate</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="w-10 px-2 py-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.code} className="border-t border-line-soft">
                    <td className="px-3 py-1.5">
                      <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                      {l.name}
                    </td>
                    <td className="px-3 py-1.5 text-right text-ink-3">{stockOf(location, l.code)}</td>
                    {review && (
                      <td className={`px-3 py-1.5 text-right ${l.qty > adminStock(l.code) ? 'font-medium text-ruby-ink' : 'text-ink-3'}`}>{adminStock(l.code)}</td>
                    )}
                    <td className="px-3 py-1.5">
                      <div className="mx-auto flex h-8 w-28 items-center overflow-hidden rounded-lg border border-line">
                        <button type="button" onClick={() => setQty(l.code, l.qty - 1)} aria-label={`One less ${l.name}`} className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist">
                          <Minus size={14} />
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`Quantity of ${l.name}`}
                          value={l.qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                            if (n > 0) setQty(l.code, n);
                          }}
                          className="h-full min-w-0 flex-1 border-x border-line bg-transparent text-center font-medium"
                        />
                        <button type="button" onClick={() => setQty(l.code, l.qty + 1)} aria-label={`One more ${l.name}`} className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist">
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right text-ink-2">{inr(l.rate)}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{inr(l.qty * l.rate)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button type="button" onClick={() => setQty(l.code, 0)} aria-label={`Remove ${l.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby">
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {short.length > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-xl bg-warn-50 px-4 py-2.5 text-[13px] text-warn-ink">
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              More than the admin stock holds:{' '}
              {short
                .slice(0, 6)
                .map((l) => `${l.code} (have ${Math.max(adminStock(l.code), 0)}, asked ${l.qty})`)
                .join(', ')}
              {short.length > 6 ? ` and ${short.length - 6} more` : ''}. Lower them, or add stock under Inventory before raising the invoice.
            </span>
          </p>
        )}

        {review && order.note && (
          <p className="rounded-xl bg-mist-2 px-4 py-2.5 text-[13px] text-ink-2">
            <span className="font-semibold">{shop.city}&rsquo;s note:</span> {order.note}
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Note <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={review ? `Optional: for ${shop.city}, kept in the order’s history` : 'Optional: anything the admin should know'}
            className="resize-none rounded-xl border border-line px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
        <div className="text-[13px] text-ink-3 tabular-nums">
          {lines.length} products · {orderQty(lines).toLocaleString('en-IN')} units · {inr(orderValue(lines))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          {review && (
            <button
              type="button"
              onClick={() => onSave({ location, lines, note: note.trim(), raise: false })}
              disabled={!lines.length}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-4 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-50"
            >
              <Save size={15} aria-hidden="true" /> Save review
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave({ location, lines, note: note.trim(), raise: review })}
            disabled={!lines.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
          >
            {review ? <FileText size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />} {review ? 'Raise invoice' : action}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default OrderEditor;
