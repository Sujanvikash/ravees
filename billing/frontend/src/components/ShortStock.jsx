import { CircleAlert, MoveDown } from 'lucide-react';

/**
 * The products that need more than the admin stock holds, each a chip that goes to its row in `table` (a ref around
 * rows marked <tr data-code>) with its quantity selected, ready to type over; with `onFit`, one button lowers them all
 * to what the admin has. `short`: [{ code, name, have, qty }]; `children`: a closing hint.
 */
const ShortStock = ({ short, table, onFit, children }) => {
  const jump = (code) => {
    const row = table.current?.querySelector(`tr[data-code="${CSS.escape(code)}"]`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.querySelector('input')?.focus({ preventScroll: true });
  };

  return (
    <div role="status" className="flex animate-pop flex-col gap-2.5 rounded-xl bg-warn-50 px-4 py-3 text-[13px] text-warn-ink">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className="flex min-w-0 flex-1 items-start gap-2">
          <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">
              {short.length} {short.length === 1 ? 'product needs' : 'products need'} more than the admin stock holds.
            </span>{' '}
            Click one to go to its row{onFit ? ', or lower them all at once' : ''}. {children}
          </span>
        </p>
        {onFit && (
          <button
            type="button"
            onClick={onFit}
            title="Each goes down to what the admin has; one the admin has none of comes off."
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-warn-ink/25 bg-surface px-3 text-xs font-semibold hover:border-warn-ink/50"
          >
            <MoveDown size={13} aria-hidden="true" /> Lower all to the admin stock
          </button>
        )}
      </div>
      <ul className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
        {short.map((l) => (
          <li key={l.code}>
            <button
              type="button"
              onClick={() => jump(l.code)}
              title={`Go to ${l.name}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-warn-ink/20 bg-surface px-2 text-xs hover:border-warn-ink/50"
            >
              <span className="font-mono font-semibold">{l.code}</span>
              <span className="tabular-nums">
                {l.have} of {l.qty}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShortStock;
