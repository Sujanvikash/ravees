import { Trash2 } from 'lucide-react';
import { buildBill, countLabel } from '../lib/bill.js';
import { customerLabel } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Bills put on hold (customer stepped away): recall one onto the counter, or discard it. */
const HeldDialog = ({ held, onRecall, onDiscard, onClose }) => (
  <Dialog id="held" title="Held bills" subtitle="Recalling one puts the bill on the counter on hold in its place" onClose={onClose} size="max-w-155">
    <ul className="max-h-[60vh] overflow-y-auto">
      {held.map((h, i) => {
        const bill = buildBill(h.items);
        return (
          <li key={h.id} className="flex items-center gap-4 border-b border-line-soft px-6 py-4">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {customerLabel(h.phone ?? '')} · held at {time.format(new Date(h.at))}
              </div>
              <div className="mt-0.5 truncate text-[13px] text-ink-3">
                {countLabel(bill)} · {bill.lines.map((l) => l.product.name).join(', ')}
              </div>
            </div>
            <div className="font-mono text-[15px] font-semibold">{inr(bill.payable)}</div>
            <button
              type="button"
              autoFocus={i === held.length - 1}
              onClick={() => onRecall(h.id)}
              className="h-10 rounded-[10px] bg-evergreen-800 px-4 text-[13px] font-bold text-white hover:bg-evergreen-900"
            >
              Recall
            </button>
            <button
              type="button"
              onClick={() => onDiscard(h.id)}
              aria-label="Discard held bill"
              className="inline-flex size-10 items-center justify-center rounded-[10px] text-ruby hover:bg-ruby-50"
            >
              <Trash2 size={17} />
            </button>
          </li>
        );
      })}
    </ul>
  </Dialog>
);

export default HeldDialog;
