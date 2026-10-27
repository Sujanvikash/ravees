import { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { formatMobile } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Pick one of this showroom's saved quotations to load into the bill at the counter, newest first. Expired
 * quotations are marked but can still be picked (the counter bills at today's prices either way).
 */
const QuotePickerDialog = ({ quotes, location, onPick, onClose }) => {
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now()); // fixed while the dialog is open
  const q = query.trim().toLowerCase();
  const list = quotes
    .filter((x) => x.location === location)
    .filter((x) => !q || `${x.quoteNo} ${x.name} ${x.phone}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <Dialog id="quote-pick" title="Load a quotation" subtitle="Its items go into the bill at today’s prices" onClose={onClose} size="max-w-2xl">
      <div className="border-t border-line-soft px-3 pt-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-evergreen-800/50">
          <Search size={15} className="text-ink-3" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quotation number, customer or mobile"
            aria-label="Search quotations"
            className="min-w-0 flex-1 bg-transparent text-sm"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FileText size={22} className="text-ink-3" aria-hidden="true" />
          <div className="text-[15px] font-semibold">{q ? 'No quotation matches that search' : 'No saved quotations yet'}</div>
        </div>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto p-3">
          {list.map((x) => {
            const expired = new Date(x.validUntil).getTime() < now;
            return (
              <li key={x.quoteNo} className="row-hover flex items-center gap-3 rounded-xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-mono text-xs font-semibold">{x.quoteNo}</span>
                    <span className="font-medium">{x.name}</span>
                    {expired && <span className="rounded-full bg-warn-50 px-1.5 py-px text-[10px] font-semibold tracking-wide text-warn-ink uppercase">Expired</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">
                    {x.phone ? formatMobile(x.phone) : 'No mobile'} · {when.format(new Date(x.at))} · {x.totals.count} items
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{inr(x.totals.payable)}</div>
                <button
                  type="button"
                  onClick={() => onPick(x)}
                  className="h-8 rounded-lg bg-evergreen-800 px-3 text-[13px] font-semibold text-white hover:bg-evergreen-900"
                >
                  Load
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
};

export default QuotePickerDialog;
