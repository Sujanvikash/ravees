import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { buildBill, countLabel } from '../lib/bill.js';
import { customerLabel } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** The items of one held bill, shown inside its card when the card is open. */
const Items = ({ bill }) => (
  <div className="mt-3 border-t border-line-soft pt-2">
    <ul aria-label="Items on this held bill" className="flex flex-col">
      {bill.lines.map((l) => (
        <li key={l.code} className="flex items-center gap-3 py-1.5 text-[13px]">
          <span className="shrink-0 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{l.code}</span>
          <span className="min-w-0 flex-1 truncate">{l.product.name}</span>
          <span className="shrink-0 text-xs text-ink-3 tabular-nums">
            {l.qty} × {inr(l.price)}
          </span>
          <span className="w-24 shrink-0 text-right font-medium tabular-nums">{inr(l.amount)}</span>
        </li>
      ))}
    </ul>
    {bill.savings > 0 && (
      <div className="mt-1 flex justify-between text-xs text-ok-ink">
        <span>Offer discount</span>
        <span className="tabular-nums">{inr(-bill.savings)}</span>
      </div>
    )}
  </div>
);

/**
 * Bills put on hold (customer stepped away). Hovering or tabbing to a bill opens its card to show the
 * items; it stays open until another one is chosen, so the list doesn't jump while the mouse moves.
 */
const HeldDialog = ({ held, onRecall, onDiscard, onClose }) => {
  const [openId, setOpenId] = useState(() => held.at(-1)?.id);

  return (
    <Dialog
      id="held"
      title="Held bills"
      subtitle="Recalling one puts the bill on the counter on hold in its place"
      onClose={onClose}
      size="max-w-2xl"
    >
      <ul className="flex max-h-[65vh] flex-col gap-1.5 overflow-y-auto border-t border-line-soft p-3">
        {held.map((h, i) => {
          const bill = buildBill(h.items);
          // After a discard the open bill may be gone: open the most recent one instead.
          const open = h.id === openId || (!held.some((x) => x.id === openId) && i === held.length - 1);
          return (
            <li
              key={h.id}
              onMouseEnter={() => setOpenId(h.id)}
              onFocus={() => setOpenId(h.id)}
              className={`rounded-xl px-4 py-3 transition-colors ${open ? 'bg-mist-2 ring-1 ring-line' : 'hover:bg-mist-2'}`}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{customerLabel(h.phone, h.name)}</span>
                    <span className="text-xs text-ink-3">held at {time.format(new Date(h.at))}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">
                    {countLabel(bill)}
                    {!open && ` · ${bill.lines.map((l) => l.product.name).join(', ')}`}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{inr(bill.payable)}</div>
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
                  autoFocus={i === held.length - 1}
                  onClick={() => onRecall(h.id)}
                  className="h-8 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                >
                  Recall
                </button>
              </div>

              {/* Opens smoothly: the grid row animates from 0fr to 1fr. */}
              <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden" aria-hidden={!open}>
                  <Items bill={bill} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
};

export default HeldDialog;
