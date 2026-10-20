import { useMemo, useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { CircleAlert, FileSpreadsheet, Minus, Plus, Search, Send, Sparkles, X } from 'lucide-react';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { findProduct, PRODUCTS, searchProducts } from '../lib/catalogue.js';
import { inr } from '../lib/money.js';
import { orderQty, orderValue } from '../lib/orders.js';
import { parsePurchaseRows } from '../lib/purchaseFile.js';
import Dialog from './Dialog.jsx';
import { LocationPicker } from './Filters.jsx';

const LOW = 5; // matches Inventory's low-stock line
const RESTOCK_TO = 10; // "Add low stock" suggests topping each item up to this many units

/**
 * Raise, edit or send a purchase order. A showroom requests stock (quantities only); the admin also sets
 * the purchase rate, can pick the showroom, and either sends it or rejects a request. Lines can be typed in,
 * picked from a search, suggested from low stock, or imported from a purchase Excel.
 */
const OrderEditor = ({ session, order, onClose, onSave, onReject }) => {
  const admin = session.role === 'admin';
  const { stockOf } = useStore();
  const [location, setLocation] = useState(order.location);
  const [lines, setLines] = useState(order.lines);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [importInfo, setImportInfo] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const fileRef = useRef(null);
  const shop = locationById(location);
  const existing = Boolean(order.number);

  const matches = useMemo(() => searchProducts(query, { limit: 6 }), [query]);

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

  const lowStock = PRODUCTS.filter((p) => p.inSeason && stockOf(location, p.code) <= LOW && !lines.some((l) => l.code === p.code));

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

  const setQty = (code, qty) => setLines((prev) => (qty > 0 ? prev.map((l) => (l.code === code ? { ...l, qty } : l)) : prev.filter((l) => l.code !== code)));
  const setRate = (code, rate) => setLines((prev) => prev.map((l) => (l.code === code ? { ...l, rate } : l)));

  const title = admin ? (existing ? `Review ${order.number}` : 'New purchase order') : existing ? `Edit request ${order.number}` : 'Request stock';
  const subtitle = admin
    ? existing
      ? `Requested by ${shop.city}. Adjust it, then send it to the showroom to count in.`
      : 'Choose the showroom; it counts the goods in when they arrive.'
    : 'The admin reviews your request and sends it back as a purchase order.';
  const action = admin ? `Send to ${shop.city}` : existing ? 'Update request' : 'Send request to admin';

  return (
    <Dialog id="order" title={title} subtitle={subtitle} onClose={onClose} size="max-w-4xl">
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        {admin && !existing && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span>For</span>
            <LocationPicker value={location} onChange={setLocation} all={false} />
          </div>
        )}

        <div className="flex flex-wrap items-start gap-2">
          <div className="relative min-w-64 flex-1">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]">
              <Search size={15} className="text-ink-3" aria-hidden="true" />
              <span className="sr-only">Add a product</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const p = findProduct(query) ?? matches[0];
                  if (p) {
                    addLines([lineFor(p)]);
                    setQuery('');
                  }
                }}
                placeholder="Add a product: scan, or search by code or name"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-ink-3"
              />
            </label>
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-11 z-10 animate-pop rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_-8px_rgba(9,9,11,0.18)]">
                {matches.map((p) => (
                  <li key={p.code}>
                    <button
                      type="button"
                      onClick={() => {
                        addLines([lineFor(p)]);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-mist"
                    >
                      <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{p.code}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-xs text-ink-3 tabular-nums">{stockOf(location, p.code)} in stock</span>
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
                  <th scope="col" className="px-3 py-2 text-right font-medium">In stock</th>
                  <th scope="col" className="px-3 py-2 text-center font-medium">Qty</th>
                  {admin && <th scope="col" className="px-3 py-2 text-right font-medium">Rate</th>}
                  {admin && <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>}
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
                    {admin && (
                      <td className="px-3 py-1.5 text-right">
                        <label className="ml-auto flex h-8 w-28 items-center gap-1 rounded-lg border border-line px-2">
                          <span className="text-ink-3">₹</span>
                          <span className="sr-only">Purchase rate of {l.name}</span>
                          <input
                            inputMode="decimal"
                            value={l.rate}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setRate(l.code, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                            className="min-w-0 flex-1 bg-transparent text-right"
                          />
                        </label>
                      </td>
                    )}
                    {admin && <td className="px-3 py-1.5 text-right font-medium">{inr(l.qty * l.rate)}</td>}
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

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          {rejecting ? 'Reason for rejecting' : 'Note'} <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={rejecting ? 'Tell the showroom why' : admin ? 'Optional: e.g. supplier, expected delivery date' : 'Optional: anything the admin should know'}
            className="resize-none rounded-xl border border-line px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
        <div className="text-[13px] text-ink-3 tabular-nums">
          {lines.length} products · {orderQty(lines).toLocaleString('en-IN')} units
          {admin && ` · ${inr(orderValue(lines))}`}
        </div>
        <div className="flex items-center gap-2">
          {admin && existing && onReject && (
            rejecting ? (
              <button type="button" onClick={() => onReject(note)} className="h-10 rounded-xl bg-ruby-50 px-3.5 text-[13px] font-semibold text-ruby-ink hover:bg-ruby/15">
                Confirm reject
              </button>
            ) : (
              <button type="button" onClick={() => setRejecting(true)} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ruby-ink hover:bg-ruby-50">
                Reject request
              </button>
            )
          )}
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          {!rejecting && (
            <button
              type="button"
              onClick={() => onSave({ location, lines, note: note.trim() })}
              disabled={!lines.length}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
            >
              <Send size={15} aria-hidden="true" /> {action}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default OrderEditor;
