import { useState } from 'react';
import { CircleAlert, CircleCheck, Minus, PackageCheck, Plus, ScanBarcode } from 'lucide-react';
import { findProduct } from '../lib/catalogue.js';
import { orderQty } from '../lib/orders.js';
import Dialog from './Dialog.jsx';
import { Segmented } from './Filters.jsx';

/**
 * Counting a sent purchase order in at the showroom. Counted quantities start at what was sent (adjust
 * any that differ), or switch to scanner counting: everything starts at 0 and each scan adds one. What is
 * counted is what goes into stock; differences are kept on the order.
 */
const CountInDialog = ({ order, onClose, onConfirm, subtitle = 'Check the delivery against the order. What you count is added to stock.' }) => {
  const sent = Object.fromEntries(order.lines.map((l) => [l.code, l.qty]));
  const [mode, setMode] = useState('sent');
  const [counted, setCounted] = useState(sent);
  const [scan, setScan] = useState('');
  const [scanNote, setScanNote] = useState(null);
  const [note, setNote] = useState('');

  const switchMode = (m) => {
    setMode(m);
    setCounted(m === 'scan' ? Object.fromEntries(order.lines.map((l) => [l.code, 0])) : sent);
    setScanNote(null);
  };

  const onScan = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const p = findProduct(scan);
    setScan('');
    if (!p) return setScanNote({ ok: false, text: `No product with code “${scan.trim()}”` });
    if (!(p.code in sent)) return setScanNote({ ok: false, text: `${p.name} is not on this order: set it aside` });
    const n = (counted[p.code] ?? 0) + 1;
    setCounted((prev) => ({ ...prev, [p.code]: n }));
    setScanNote({ ok: n <= sent[p.code], text: `${p.name}: ${n} of ${sent[p.code]}` });
  };

  const totalCounted = Object.values(counted).reduce((a, b) => a + b, 0);
  const diffs = order.lines.filter((l) => (counted[l.code] ?? 0) !== l.qty).length;

  return (
    <Dialog
      id="countin"
      title={`Count in ${order.number}`}
      subtitle={subtitle}
      onClose={onClose}
      size="max-w-3xl"
    >
      <div className="flex flex-col gap-4 border-t border-line-soft px-6 pt-4 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="How to count"
            options={[
              { id: 'sent', label: 'Start from sent quantities' },
              { id: 'scan', label: 'Count with scanner' },
            ]}
            value={mode}
            onChange={switchMode}
          />
          {mode === 'scan' && (
            <label className="flex h-9 min-w-64 flex-1 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]">
              <ScanBarcode size={15} className="text-ink-3" aria-hidden="true" />
              <span className="sr-only">Scan each item</span>
              <input
                autoFocus
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={onScan}
                placeholder="Scan each item as you unpack it"
                className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-ink-3"
              />
            </label>
          )}
        </div>
        {scanNote && (
          <p role="status" className={`-mt-2 flex animate-pop items-center gap-1.5 text-xs font-medium ${scanNote.ok ? 'text-ok-ink' : 'text-warn-ink'}`}>
            {scanNote.ok ? <CircleCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
            {scanNote.text}
          </p>
        )}

        <div className="max-h-[46vh] overflow-auto rounded-xl border border-line-soft">
          <table className="w-full min-w-[36rem] text-[13px] tabular-nums">
            <thead className="sticky top-0 z-1 bg-mist-2 text-left text-xs text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Product</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Sent</th>
                <th scope="col" className="px-3 py-2 text-center font-medium">Counted</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => {
                const c = counted[l.code] ?? 0;
                const d = c - l.qty;
                return (
                  <tr key={l.code} className={`border-t border-line-soft ${d ? 'bg-warn-50/50' : ''}`}>
                    <td className="px-3 py-1.5">
                      <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
                      {l.name}
                    </td>
                    <td className="px-3 py-1.5 text-right text-ink-2">{l.qty}</td>
                    <td className="px-3 py-1.5">
                      <div className="mx-auto flex h-8 w-28 items-center overflow-hidden rounded-lg border border-line bg-surface">
                        <button type="button" onClick={() => setCounted((p) => ({ ...p, [l.code]: Math.max(c - 1, 0) }))} aria-label={`One less ${l.name}`} className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist">
                          <Minus size={14} />
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`Counted ${l.name}`}
                          value={c}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCounted((p) => ({ ...p, [l.code]: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 }))}
                          className="h-full min-w-0 flex-1 border-x border-line bg-transparent text-center font-medium"
                        />
                        <button type="button" onClick={() => setCounted((p) => ({ ...p, [l.code]: c + 1 }))} aria-label={`One more ${l.name}`} className="inline-flex size-8 items-center justify-center text-ink-2 hover:bg-mist">
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className={`px-3 py-1.5 text-right font-medium ${d < 0 ? 'text-ruby-ink' : d > 0 ? 'text-warn-ink' : 'text-ok-ink'}`}>
                      {d === 0 ? 'Matches' : d < 0 ? `${-d} short` : `${d} extra`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          Note <span className="sr-only">(optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={diffs ? 'What happened to the difference? e.g. 2 broken in transit' : 'Optional'}
            className="resize-none rounded-xl border border-line px-3 py-2 font-normal text-ink placeholder:text-ink-3 focus:border-evergreen-800/50"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-mist-2 px-6 py-4">
        <div className="text-[13px] text-ink-3 tabular-nums">
          Counted {totalCounted.toLocaleString('en-IN')} of {orderQty(order.lines).toLocaleString('en-IN')} units
          {diffs > 0 && <span className="ml-1 font-medium text-warn-ink">· {diffs} {diffs === 1 ? 'line differs' : 'lines differ'}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-3.5 text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink">
            Not yet
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.lines.map((l) => ({ code: l.code, qty: counted[l.code] ?? 0 })).filter((l) => l.qty > 0), note.trim())}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
          >
            <PackageCheck size={16} aria-hidden="true" /> Add {totalCounted.toLocaleString('en-IN')} units to stock
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default CountInDialog;
