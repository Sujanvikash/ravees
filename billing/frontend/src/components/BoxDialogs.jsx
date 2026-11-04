import { useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { CircleAlert, Download, FileSpreadsheet, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { activeLocations, locationById } from '../config.js';
import { boxUnits, parseBoxRows } from '../lib/boxes.js';
import { newId } from '../lib/uid.js';
import Dialog from './Dialog.jsx';
import ScanBar from './ScanBar.jsx';

const field =
  'h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm transition-shadow placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]';
const primary =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-50';
const quiet = 'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink';

/** The showroom select used for tagging: "Not tagged yet" or one of the stores in use. */
export const ShowroomSelect = ({ value, onChange, id, className = field }) => (
  <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={className}>
    <option value="">Not tagged yet</option>
    {activeLocations().map((l) => (
      <option key={l.id} value={l.id}>
        {l.city} · {l.area}
      </option>
    ))}
  </select>
);

/**
 * One box by hand: its number and stock number from the label, the shipment and supplier, the showroom it goes
 * to, and the products inside (scan or search each, then set the quantity). Also edits a box still packed.
 * A new box starts with the shipment and supplier of the last one entered, as boxes come in shipments.
 */
export const BoxEditor = ({ box, last, onClose, onSave }) => {
  const [form, setForm] = useState(() => ({
    boxNo: box?.boxNo ?? '',
    stockNo: box?.stockNo ?? '',
    shipment: box?.shipment ?? last?.shipment ?? '',
    supplier: box?.supplier ?? last?.supplier ?? '',
    location: box?.location ?? null,
  }));
  const [lines, setLines] = useState(() => box?.lines.map((l) => ({ code: l.code, name: l.name, qty: l.qty })) ?? []);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const scanRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = (product) => {
    setLines((ls) =>
      ls.some((l) => l.code === product.code)
        ? ls.map((l) => (l.code === product.code ? { ...l, qty: l.qty + 1 } : l))
        : [...ls, { code: product.code, name: product.name, qty: 1 }],
    );
    setNotice({ tone: 'ok', text: `${product.code} added` });
  };
  const setQty = (code, qty) => setLines((ls) => ls.map((l) => (l.code === code ? { ...l, qty: Math.max(1, Math.min(qty || 1, 100000)) } : l)));

  const save = async () => {
    if (!form.boxNo.trim()) return setError('Enter the box number from the label.');
    if (!lines.length) return setError('Add the products in the box.');
    setSaving(true);
    setError('');
    try {
      await onSave({ id: box?.id ?? newId(), ...form, boxNo: form.boxNo.trim(), lines: lines.map(({ code, qty }) => ({ code, qty })) });
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  return (
    <Dialog id="box-editor" title={box ? `Box ${box.boxNo}` : 'New box'} subtitle="Copy the label: box number, stock number and the products inside." onClose={onClose}>
      <div className="flex flex-col gap-4 px-6 pb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Box number <span className="sr-only">(required)</span>
            <input value={form.boxNo} onChange={set('boxNo')} placeholder="e.g. 154.GOA" autoFocus className={`${field} font-mono uppercase placeholder:font-sans placeholder:normal-case`} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            <span className="flex items-baseline gap-1.5">
              Stock number <span className="text-xs font-normal text-ink-3">optional</span>
            </span>
            <input value={form.stockNo} onChange={set('stockNo')} placeholder="e.g. PUA000445" className={`${field} font-mono uppercase placeholder:font-sans placeholder:normal-case`} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            <span className="flex items-baseline gap-1.5">
              Shipment <span className="text-xs font-normal text-ink-3">optional</span>
            </span>
            <input value={form.shipment} onChange={set('shipment')} placeholder="e.g. GOA-1 VELANKA 2026" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            <span className="flex items-baseline gap-1.5">
              Supplier <span className="text-xs font-normal text-ink-3">optional</span>
            </span>
            <input value={form.supplier} onChange={set('supplier')} placeholder="e.g. ARK Global Traders" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium sm:col-span-2">
            Goes to
            <ShowroomSelect value={form.location} onChange={(location) => setForm((f) => ({ ...f, location }))} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-medium">Products in the box</h3>
          <ScanBar inputRef={scanRef} onAdd={add} notice={notice} onNotice={setNotice} inStock={() => 0} />
          {lines.length > 0 && (
            <ul className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-line-soft bg-surface p-1">
              {lines.map((l) => (
                <li key={l.code} className="flex items-center gap-3 px-2 py-1.5 text-[13px]">
                  <span className="rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty(l.code, l.qty - 1)} aria-label={`One less ${l.code}`} className="inline-flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-mist">
                      <Minus size={14} />
                    </button>
                    <input
                      inputMode="numeric"
                      value={l.qty}
                      onChange={(e) => setQty(l.code, Number(e.target.value.replace(/\D/g, '')))}
                      aria-label={`Quantity of ${l.code}`}
                      className="h-7 w-14 rounded-lg border border-line bg-surface text-center tabular-nums"
                    />
                    <button type="button" onClick={() => setQty(l.code, l.qty + 1)} aria-label={`One more ${l.code}`} className="inline-flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-mist">
                      <Plus size={14} />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.code !== l.code))}
                    aria-label={`Remove ${l.code}`}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby-ink"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="animate-pop rounded-xl bg-ruby-50 px-4 py-2.5 text-[13px] font-medium text-ruby-ink">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft pt-4">
          <span className="mr-auto text-[13px] text-ink-3 tabular-nums">
            {lines.length} {lines.length === 1 ? 'product' : 'products'} · {boxUnits(lines).toLocaleString('en-IN')} units
          </span>
          <button type="button" onClick={onClose} className={quiet}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={primary}>
            <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save box'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

/**
 * A whole packing list from Excel: one row per product, with the box number on each row (or on the box's first
 * row only). Boxes already entered and still packed are updated from the sheet; received ones are skipped.
 */
export const BoxImport = ({ boxes, onClose, onSave }) => {
  const [file, setFile] = useState(null); // { name, boxes, problems } | { error }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef(null);

  const readFile = async (f) => {
    if (!f) return;
    try {
      const parsed = parseBoxRows(await readSheet(f));
      if (parsed.error) setFile({ error: parsed.error });
      else {
        const problems = [...parsed.problems];
        const ready = parsed.boxes.filter((b) => {
          const existing = boxes.find((x) => x.boxNo === b.boxNo);
          if (existing && existing.status !== 'packed') {
            problems.push({ row: b.rows[0], box: b.boxNo, code: '', reason: 'Already received: skipped' });
            return false;
          }
          return true;
        });
        setFile({ name: f.name, boxes: ready, problems });
      }
    } catch {
      setFile({ error: `${f.name} could not be read as an .xlsx sheet.` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const list = file?.boxes ?? [];
  const updates = list.filter((b) => boxes.some((x) => x.boxNo === b.boxNo)).length;
  const untagged = list.filter((b) => !b.location).length;

  const confirm = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onSave(
        list.map((b) => ({
          id: boxes.find((x) => x.boxNo === b.boxNo)?.id ?? newId(),
          boxNo: b.boxNo,
          stockNo: b.stockNo,
          shipment: b.shipment,
          supplier: b.supplier,
          location: b.location,
          lines: b.lines.map(({ code, qty }) => ({ code, qty })),
        })),
      );
    } catch (err) {
      setSaving(false);
      setSaveError(err.message);
    }
  };

  return (
    <Dialog id="box-import" title="Import a packing list" subtitle="Every box in the shipment from one Excel sheet: a row for each product, with its box number." onClose={onClose}>
      <div className="flex flex-col gap-4 px-6 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900">
            <FileSpreadsheet size={15} aria-hidden="true" /> {file ? 'Choose another file' : 'Choose Excel file'}
            <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => readFile(e.target.files[0])} />
          </label>
          <a href="/box-template.xlsx" download className={quiet}>
            <Download size={15} aria-hidden="true" /> Template
          </a>
          <span className="text-xs text-ink-3">Box No, Code and Qty columns; Stock No, Shipment, Supplier and Showroom are optional.</span>
        </div>

        {file?.error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-50 px-4 py-2.5 text-[13px] text-warn-ink">
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {file.error}
          </p>
        )}

        {file && !file.error && (
          <>
            <div role="status" className="rounded-xl bg-ok-50 px-4 py-2.5 text-[13px] text-ok-ink">
              <span className="font-semibold">{file.name}</span>: {list.length} {list.length === 1 ? 'box' : 'boxes'},{' '}
              {list.reduce((t, b) => t + boxUnits(b.lines), 0).toLocaleString('en-IN')} units
              {updates > 0 && ` · ${updates} already entered will be updated`}
              {untagged > 0 && ` · ${untagged} not tagged for a showroom yet`}
            </div>
            {file.problems.length > 0 && (
              <details className="rounded-xl bg-warn-50 px-4 py-2.5 text-[13px] text-warn-ink" open={file.problems.length <= 8}>
                <summary className="cursor-pointer font-semibold">
                  {file.problems.length} {file.problems.length === 1 ? 'row' : 'rows'} to check (left out)
                </summary>
                <ul className="mt-2 flex max-h-40 flex-col gap-0.5 overflow-y-auto text-xs">
                  {file.problems.map((p, i) => (
                    <li key={i}>
                      Row {p.row}
                      {p.box && ` · box ${p.box}`}
                      {p.code && ` · ${p.code}`}: {p.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {list.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-xl border border-line-soft">
                <table className="w-full text-[13px] tabular-nums">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-ink-3">
                      <th scope="col" className="px-3 py-2 font-medium">Box</th>
                      <th scope="col" className="px-3 py-2 font-medium">Stock no.</th>
                      <th scope="col" className="px-3 py-2 font-medium">Goes to</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Products</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((b) => (
                      <tr key={b.boxNo} className="border-t border-line-soft">
                        <td className="px-3 py-1.5 font-mono text-xs">{b.boxNo}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-ink-2">{b.stockNo || '—'}</td>
                        <td className="px-3 py-1.5 text-ink-2">{b.location ? locationById(b.location)?.city : 'Not tagged'}</td>
                        <td className="px-3 py-1.5 text-right">{b.lines.length}</td>
                        <td className="px-3 py-1.5 text-right">{boxUnits(b.lines)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {saveError && (
          <p role="alert" className="rounded-xl bg-ruby-50 px-4 py-2.5 text-[13px] font-medium text-ruby-ink">
            Nothing was saved: {saveError}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-line-soft pt-4">
          <button type="button" onClick={onClose} className={quiet}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!list.length || saving} className={primary}>
            <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : `Save ${list.length} ${list.length === 1 ? 'box' : 'boxes'}`}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
