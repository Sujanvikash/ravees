import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { buildBill, countLabel } from '../lib/bill.js';
import { customerLabel } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** The right-hand preview: every item on the held bill, and its totals. */
const Preview = ({ entry, onRecall }) => {
  const { bill } = entry;
  return (
    <div className="flex min-h-0 flex-col" aria-live="polite">
      <div className="px-5 pt-1 pb-3">
        <div className="text-sm font-medium">{customerLabel(entry.phone ?? '')}</div>
        <div className="text-xs text-ink-3">
          Held at {time.format(new Date(entry.at))} · {countLabel(bill)}
        </div>
      </div>
      <ul aria-label="Items on this held bill" className="min-h-0 flex-1 overflow-y-auto px-3">
        {bill.lines.map((l) => (
          <li key={l.code} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13px]">
            <span className="shrink-0 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{l.product.name}</span>
              <span className="block text-xs text-ink-3 tabular-nums">
                {l.qty} × {inr(l.price)}
              </span>
            </span>
            <span className="font-medium tabular-nums">{inr(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line-soft px-5 pt-3 pb-5">
        <div className="flex flex-col gap-1 text-xs text-ink-3">
          <div className="flex justify-between">
            <span>MRP total</span>
            <span className="tabular-nums">{inr(bill.mrpTotal)}</span>
          </div>
          {bill.savings > 0 && (
            <div className="flex justify-between text-ok-ink">
              <span>Offer discount</span>
              <span className="tabular-nums">{inr(-bill.savings)}</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[13px] font-medium text-ink-2">Total</span>
          <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{inr(bill.payable)}</span>
        </div>
        <button
          type="button"
          onClick={() => onRecall(entry.id)}
          className="mt-4 h-10 w-full rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
        >
          Recall this bill
        </button>
      </div>
    </div>
  );
};

/**
 * Bills put on hold (customer stepped away). Hovering or tabbing to one shows all its items on the right;
 * recall it onto the counter, or discard it.
 */
const HeldDialog = ({ held, onRecall, onDiscard, onClose }) => {
  const entries = held.map((h) => ({ ...h, bill: buildBill(h.items) }));
  const [previewId, setPreviewId] = useState(() => held.at(-1)?.id);
  // After a discard the previewed bill may be gone: fall back to the most recent one.
  const preview = entries.find((e) => e.id === previewId) ?? entries.at(-1);

  return (
    <Dialog
      id="held"
      title="Held bills"
      subtitle="Recalling one puts the bill on the counter on hold in its place"
      onClose={onClose}
      size="max-w-4xl"
    >
      <div className="grid max-h-[65vh] min-h-80 grid-cols-1 border-t border-line-soft md:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto p-3">
          {entries.map((h, i) => {
            const on = h.id === preview?.id;
            return (
              <li
                key={h.id}
                onMouseEnter={() => setPreviewId(h.id)}
                onFocus={() => setPreviewId(h.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                  on ? 'bg-mist-2 ring-1 ring-line' : 'hover:bg-mist-2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{customerLabel(h.phone ?? '')}</span>
                    <span className="text-xs text-ink-3">held at {time.format(new Date(h.at))}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">
                    {countLabel(h.bill)} · {h.bill.lines.map((l) => l.product.name).join(', ')}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{inr(h.bill.payable)}</div>
                <button
                  type="button"
                  onClick={() => onDiscard(h.id)}
                  aria-label="Discard held bill"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-ruby-50 hover:text-ruby"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  autoFocus={i === entries.length - 1}
                  onClick={() => onRecall(h.id)}
                  className="h-8 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                >
                  Recall
                </button>
              </li>
            );
          })}
        </ul>

        {preview && (
          <div className="flex min-h-0 flex-col border-t border-line-soft bg-mist-2 pt-4 md:border-t-0 md:border-l">
            <Preview key={preview.id} entry={preview} onRecall={onRecall} />
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default HeldDialog;
