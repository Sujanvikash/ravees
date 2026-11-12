import { useMemo, useState } from 'react';
import { Search, Undo2 } from 'lucide-react';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useCatalogue } from '../hooks/useCatalogue.js';
import { inr } from '../lib/money.js';
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
 * At the end of the season every product in stock starts at all of it (until a quantity is changed by hand); one
 * lowered or left out is marked here, and the admin sees what was kept back (the server keeps what the showroom had).
 * The LR number, vehicle and cartons are printed on the return; they can be filled in later too. What is returned and
 * what is kept are shown in units and in value at D.Rate (the cost price): a purchase return carries no GST.
 */
const SendBackDialog = ({ location, onClose, onDone }) => {
  const { stockOf, sendStockBack } = useStore();
  const products = useCatalogue();
  const [query, setQuery] = useState('');
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState('end-of-season');
  const [touched, setTouched] = useState(false); // a quantity was changed by hand: the reason no longer refills them
  const [filled, setFilled] = useState(false);
  const [transport, setTransport] = useState({ lrNo: '', vehicleNo: '', cartons: '' });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shop = locationById(location);

  const inStock = useMemo(() => products.filter((p) => stockOf(location, p.code) > 0), [products, stockOf, location]);
  // everything in stock, of the admin's products only (a showroom's own never came from the admin)
  const everything = () => Object.fromEntries(inStock.filter((p) => !p.shop).map((p) => [p.code, stockOf(location, p.code)]));
  if (!filled && inStock.length) {
    // the end of the season starts at everything in stock, once the stock is there (set while rendering)
    setFilled(true);
    if (reason === 'end-of-season' && !touched) setQty(everything());
  }
  const season = reason === 'end-of-season';
  const pickReason = (id) => {
    setReason(id);
    if (!touched) setQty(id === 'end-of-season' ? everything() : {});
  };
  const change = (code, n) => {
    setTouched(true);
    setQty((m) => ({ ...m, [code]: n }));
  };
  const q = query.trim().toLowerCase();
  const list = inStock.filter((p) => !q || `${p.code} ${p.name}`.toLowerCase().includes(q)).slice(0, 100);
  const chosen = Object.entries(qty).filter(([, n]) => n > 0);
  const units = chosen.reduce((t, [, n]) => t + n, 0);
  const costOf = useMemo(() => new Map(products.map((p) => [p.code, p.cost ?? 0])), [products]);
  const value = chosen.reduce((t, [code, n]) => t + n * (costOf.get(code) ?? 0), 0);
  // at the end of the season, what stays behind: products sent fewer of than held, and products not sent at all
  const lowered = season ? inStock.filter((p) => !p.shop && (qty[p.code] ?? 0) > 0 && qty[p.code] < stockOf(location, p.code)) : [];
  const left = season ? inStock.filter((p) => !p.shop && !(qty[p.code] > 0)) : [];
  const keeping = [...lowered, ...left].reduce(
    (t, p) => {
      const n = stockOf(location, p.code) - (qty[p.code] ?? 0);
      return { units: t.units + n, value: t.value + n * (p.cost ?? 0) };
    },
    { units: 0, value: 0 },
  );

  // "Return all": the whole in-stock quantity of every product currently listed (respecting the search).
  const allSelected = list.length > 0 && list.every((p) => (qty[p.code] ?? 0) === stockOf(location, p.code));
  const toggleAll = () => {
    setTouched(true);
    setQty((m) => {
      const next = { ...m };
      for (const p of list) {
        if (allSelected) delete next[p.code];
        else next[p.code] = stockOf(location, p.code);
      }
      return next;
    });
  };

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const record = await sendStockBack({
        lines: chosen.map(([code, n]) => ({ code, qty: n })),
        reason,
        note: note.trim(),
        lrNo: transport.lrNo.trim(),
        vehicleNo: transport.vehicleNo.trim(),
        cartons: transport.cartons === '' ? null : Number(transport.cartons),
      });
      onDone(record);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog id="send-back" title="New purchase return" subtitle={`From ${shop.label} to the admin · the units leave your stock when you send them`} onClose={onClose} size="max-w-2xl">
      <div className="flex flex-col gap-3 px-6 pb-5">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pickReason(r.id)}
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
                <th className="py-1.5 pr-3 text-right font-medium">
                  <label className="inline-flex cursor-pointer items-center justify-end gap-1.5 select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={!list.length}
                      onChange={toggleAll}
                      aria-label="Return all products in stock"
                      className="size-3.5 accent-evergreen-800 disabled:opacity-40"
                    />
                    <span>Return all</span>
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const have = stockOf(location, p.code);
                const keeping = season && !p.shop ? have - (qty[p.code] ?? 0) : 0;
                return (
                  <tr key={p.code} className={`border-b border-line-soft ${keeping > 0 ? 'bg-warn-50' : ''}`}>
                    <td className="py-1.5 pr-3 pl-3">
                      <span className="font-mono text-[11px] text-ink-3">{p.code}</span> {p.name}
                      {keeping > 0 && <span className="ml-2 text-[11px] font-medium whitespace-nowrap text-warn-ink">keeping {keeping === have ? 'all' : keeping}</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-ink-2">{have}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        inputMode="numeric"
                        value={qty[p.code] ?? ''}
                        onChange={(e) => change(p.code, Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, have))}
                        aria-label={`Units of ${p.name} to return`}
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
        {(lowered.length > 0 || left.length > 0) && (
          <p role="status" className="rounded-xl bg-warn-50 px-3 py-2 text-xs text-warn-ink">
            <span className="font-semibold">
              Not returning {keeping.units.toLocaleString('en-IN')} pcs · {inr(keeping.value)}:
            </span>{' '}
            {[lowered.length && `${lowered.length} ${lowered.length === 1 ? 'product' : 'products'} in part`, left.length && `${left.length} ${left.length === 1 ? 'product' : 'products'} entirely`].filter(Boolean).join(' and ')}.
            The admin sees what you keep: say why in the note.
          </p>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_9rem_6rem] gap-2">
          <input
            value={transport.lrNo}
            onChange={(e) => setTransport((t) => ({ ...t, lrNo: e.target.value }))}
            placeholder="LR No. (optional)"
            aria-label="LR number"
            className="h-10 min-w-0 rounded-xl border border-line bg-white px-3 text-[13px]"
          />
          <input
            value={transport.vehicleNo}
            onChange={(e) => setTransport((t) => ({ ...t, vehicleNo: e.target.value }))}
            placeholder="Vehicle No."
            aria-label="Vehicle number"
            className="h-10 min-w-0 rounded-xl border border-line bg-white px-3 text-[13px] uppercase placeholder:normal-case"
          />
          <input
            inputMode="numeric"
            value={transport.cartons}
            onChange={(e) => setTransport((t) => ({ ...t, cartons: e.target.value.replace(/\D/g, '') }))}
            placeholder="Cartons"
            aria-label="Cartons"
            className="h-10 min-w-0 rounded-xl border border-line bg-white px-3 text-[13px]"
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={lowered.length || left.length ? 'Why are you keeping some back? (for the admin)' : 'Note for the admin (optional), e.g. for Mumbai'}
          aria-label="Note"
          className="h-10 rounded-xl border border-line bg-white px-3 text-[13px]"
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-ruby-ink">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
          <span className="text-[13px] text-ink-3">
            Returning {chosen.length} products · {units.toLocaleString('en-IN')} pcs · <span className="font-semibold text-ink">{inr(value)}</span> at D.Rate
          </span>
          <button type="button" onClick={send} disabled={!units || busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3">
            <Undo2 size={15} aria-hidden="true" /> Send to admin
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default SendBackDialog;
