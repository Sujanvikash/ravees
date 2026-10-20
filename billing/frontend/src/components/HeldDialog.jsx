import { Trash2 } from 'lucide-react';
import { buildBill, countLabel } from '../lib/bill.js';
import { customerLabel } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Bills put on hold (customer stepped away): recall one onto the counter, or discard it. */
const HeldDialog = ({ held, onRecall, onDiscard, onClose }) => (
  <Dialog
    id="held"
    title="Held bills"
    subtitle="Recalling one puts the bill on the counter on hold in its place"
    onClose={onClose}
    size="max-w-xl"
  >
    <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-3 pb-3">
      {held.map((h, i) => {
        const bill = buildBill(h.items);
        return (
          <li key={h.id} className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-mist-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{customerLabel(h.phone ?? '')}</span>
                <span className="text-xs text-ink-3">held at {time.format(new Date(h.at))}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-ink-3">
                {countLabel(bill)} · {bill.lines.map((l) => l.product.name).join(', ')}
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
          </li>
        );
      })}
    </ul>
  </Dialog>
);

export default HeldDialog;
