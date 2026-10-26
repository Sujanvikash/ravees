import { useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { CircleAlert, Download, FileSpreadsheet, PackageCheck } from 'lucide-react';
import { LOCATIONS, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { orderQty } from '../lib/orders.js';
import { parsePurchaseRows } from '../lib/purchaseFile.js';
import Dialog from './Dialog.jsx';
import { LocationPicker } from './Filters.jsx';

/**
 * Adds stock straight from an Excel (opening stock, or goods that came outside a purchase order). Same sheet
 * as a purchase: a Code and a Qty column, Rate optional. Shows each product's stock now and after, and only
 * changes stock when confirmed. A showroom imports into its own stock; the admin picks the showroom.
 */
const ImportStockDialog = ({ session, defaultLocation, onClose, onDone }) => {
  const admin = session.role === 'admin';
  const { stockOf, importStock } = useStore();
  const [location, setLocation] = useState(admin ? (defaultLocation ?? LOCATIONS[0].id) : session.location);
  const [file, setFile] = useState(null); // { name, lines, problems } | { error }
  const fileRef = useRef(null);
  const shop = locationById(location);

  const readFile = async (f) => {
    if (!f) return;
    try {
      const parsed = parsePurchaseRows(await readSheet(f));
      setFile(parsed.error ? { error: parsed.error } : { name: f.name, lines: parsed.lines, problems: parsed.problems });
    } catch {
      setFile({ error: `${f.name} could not be read as an .xlsx sheet.` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const lines = file?.lines ?? [];
  const units = orderQty(lines);

  const confirm = () => {
    const record = {
      id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      by: admin ? 'Admin' : shop.city, // same as purchase order history
      username: session.username,
      location,
      file: file.name,
      lines: lines.map((l) => ({ code: l.code, name: l.name, qty: l.qty, rate: l.rate })),
    };
    importStock(record);
    onDone(record);
  };

  return (
    <Dialog
      id="import-stock"
      title="Import stock from Excel"
      subtitle={`Adds the quantities in the sheet to ${shop.city} · ${shop.area} stock. Use it for opening stock or goods that came without a purchase order.`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 px-6 pb-5">
        {admin && <LocationPicker value={location} onChange={setLocation} all={false} />}

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900">
            <FileSpreadsheet size={15} aria-hidden="true" /> {file ? 'Choose another file' : 'Choose Excel file'}
            <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => readFile(e.target.files[0])} />
          </label>
          <a
            href="/purchase-template.xlsx"
            download
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
          >
            <Download size={15} aria-hidden="true" /> Template
          </a>
          <span className="text-xs text-ink-3">.xlsx with a Code and a Qty column; Rate is optional.</span>
        </div>

        {file && (
          <div
            role="status"
            className={`flex animate-pop items-start gap-2 rounded-xl px-4 py-2.5 text-[13px] ${file.error || file.problems?.length ? 'bg-warn-50 text-warn-ink' : 'bg-ok-50 text-ok-ink'}`}
          >
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              {file.error ?? `${file.name}: ${lines.length} products ready to add.`}
              {file.problems?.length > 0 && (
                <span>
                  {' '}
                  Skipped {file.problems.length}:{' '}
                  {file.problems
                    .slice(0, 4)
                    .map((p) => `row ${p.row} ${p.code ? `(${p.code}) ` : ''}${p.reason.toLowerCase()}`)
                    .join('; ')}
                  {file.problems.length > 4 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="max-h-[42vh] min-h-40 overflow-auto rounded-xl border border-line-soft">
          {lines.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-ink-3">Choose an Excel to see what will be added before anything changes.</p>
          ) : (
            <table className="w-full min-w-[36rem] text-[13px] tabular-nums">
              <thead className="sticky top-0 z-1 bg-mist-2 text-left text-xs text-ink-3">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 pl-4 font-medium">Code</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Product</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">In stock now</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Adding</th>
                  <th scope="col" className="py-1.5 pr-4 text-right font-medium">After</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const now = stockOf(location, l.code);
                  return (
                    <tr key={l.code} className="border-t border-line-soft">
                      <td className="py-1.5 pr-3 pl-4 font-mono text-xs">{l.code}</td>
                      <td className="py-1.5 pr-3 font-medium">{l.name}</td>
                      <td className="py-1.5 pr-3 text-right text-ink-3">{now}</td>
                      <td className="py-1.5 pr-3 text-right font-medium text-ok-ink">+{l.qty}</td>
                      <td className="py-1.5 pr-4 text-right font-semibold">{now + l.qty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
        <div className="text-[13px] text-ink-3 tabular-nums">
          {lines.length} products · {units.toLocaleString('en-IN')} units
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!lines.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none"
          >
            <PackageCheck size={15} aria-hidden="true" /> Add {units ? `${units.toLocaleString('en-IN')} units ` : ''}to {shop.city} stock
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default ImportStockDialog;
