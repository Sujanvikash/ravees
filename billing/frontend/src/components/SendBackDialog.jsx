import { useMemo, useState } from 'react';
import { Search, Undo2 } from 'lucide-react';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useCatalogue } from '../hooks/useCatalogue.js';
import Dialog from './Dialog.jsx';

const REASONS = [
  { id: 'end-of-season', label: 'End of the season' },
  { id: 'another-store', label: 'Another showroom needs it' },
  { id: 'damaged', label: 'Damaged' },
  { id: 'other', label: 'Other' },
];

/**
 * A showroom sends stock back to the admin (only ever to the admin): what's left at the end of the season, or
 * items another showroom needs. The units leave this showroom's stock when it is sent; the admin counts them in
 * when they arrive. It can't send more than it has.
 */
const SendBackDialog = ({ location, onClose, onDone }) => {
  const { stockOf, sendStockBack } = useStore();
  const products = useCatalogue();
  const [query, setQuery] = useState('');
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState('end-of-season');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shop = locationById(location);

  const inStock = useMemo(() => products.filter((p) => stockOf(location, p.code) > 0), [products, stockOf, location]);
  const q = query.trim().toLowerCase();
  const list = inStock.filter((p) => !q || `${p.code} ${p.name}`.toLowerCase().includes(q)).slice(0, 100);
  const chosen = Object.entries(qty).filter(([, n]) => n > 0);
  const units = chosen.reduce((t, [, n]) => t + n, 0);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const record = await sendStockBack({ lines: chosen.map(([code, n]) => ({ code, qty: n })), reason, note: note.trim() });
      onDone(record);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog id="send-back" title="Send stock back to the admin" subtitle={`From ${shop.city} · the units leave your stock when you send them`} onClose={onClose} size="max-w-2xl">
      <div className="flex flex-col gap-3 px-6 pb-5">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              aria-pressed={reason === r.id}
              className={`h-8 rounded-full border px-3 text-[13px] font-medium ${reason === r.id ? 'border-evergreen-800 bg-evergreen-800 text-white' : 'border-line text-ink-2 hover:bg-mist'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search size={15} className="text-ink-3" aria-hidden="true" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Code or product name" aria-label="Find a product" className="min-w-0 flex-1 bg-transparent text-sm" />
        </label>
        <div className="max-h-80 overflow-y-auto rounded-xl border border-line-soft">
          <table className="w-full text-[13px] tabular-nums">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                <th className="py-1.5 pr-3 pl-3 font-medium">Product</th>
                <th className="py-1.5 pr-3 text-right font-medium">In stock</th>
                <th className="py-1.5 pr-3 text-right font-medium">Send back</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const have = stockOf(location, p.code);
                return (
                  <tr key={p.code} className="border-b border-line-soft">
                    <td className="py-1.5 pr-3 pl-3">
                      <span className="font-mono text-[11px] text-ink-3">{p.code}</span> {p.name}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-ink-2">{have}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        inputMode="numeric"
                        value={qty[p.code] ?? ''}
                        onChange={(e) => setQty((m) => ({ ...m, [p.code]: Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, have) }))}
                        aria-label={`Units of ${p.name} to send back`}
                        placeholder="0"
                        className="h-8 w-16 rounded-lg border border-line px-2 text-right"
                      />
                    </td>
                  </tr>
                );
              })}
              {!list.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-ink-3">
                    Nothing in stock matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the admin (optional), e.g. for Mumbai" aria-label="Note" className="h-10 rounded-xl border border-line bg-white px-3 text-[13px]" />
        {error && (
          <p role="alert" className="text-xs font-medium text-ruby-ink">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
          <span className="text-[13px] text-ink-3">
            {chosen.length} products · {units.toLocaleString('en-IN')} units
          </span>
          <button type="button" onClick={send} disabled={!units || busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3">
            <Undo2 size={15} aria-hidden="true" /> Send back
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default SendBackDialog;
