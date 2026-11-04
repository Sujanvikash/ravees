import { CircleCheck, UserPlus } from 'lucide-react';
import { formatMobile } from '../lib/customer.js';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The dropdown under a customer input (see useCustomerLookup): name, mobile and bills for each suggestion. It
 * shows only for the input it belongs to (`which`); a click picks without taking focus from the input.
 */
export const CustomerSuggestions = ({ id, which, lookup }) => {
  if (lookup.field !== which || lookup.items.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Customers"
      className="absolute inset-x-0 top-full z-30 mt-1 animate-pop overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_-8px_rgba(9,9,11,0.25)]"
    >
      {lookup.items.map((c, i) => (
        <li
          key={c.phone}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === lookup.at}
          onMouseDown={(e) => {
            e.preventDefault();
            lookup.pick(c);
          }}
          onMouseEnter={() => lookup.setActive(i)}
          className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px] ${i === lookup.at ? 'bg-evergreen-50' : ''}`}
        >
          <span className="min-w-0 flex-1 truncate font-medium">{c.name || 'No name'}</span>
          <span className="text-xs text-ink-2 tabular-nums">{formatMobile(c.phone)}</span>
          <span className="w-14 text-right text-[11px] text-ink-3 tabular-nums">
            {c.bills} {c.bills === 1 ? 'bill' : 'bills'}
          </span>
        </li>
      ))}
    </ul>
  );
};

/** One line under the customer inputs: a returning customer (with their bills and last visit) or a new one. */
export const CustomerStatus = ({ status, newNote = 'the name is remembered after this bill' }) => {
  if (!status) return null;
  return status.kind === 'returning' ? (
    <p className="flex animate-pop items-center gap-1.5 text-xs text-ok-ink" role="status">
      <CircleCheck size={13} aria-hidden="true" />
      Returning customer · {status.bills} {status.bills === 1 ? 'bill' : 'bills'} · last on {day.format(new Date(status.last))}
    </p>
  ) : (
    <p className="flex animate-pop items-center gap-1.5 text-xs text-ink-3" role="status">
      <UserPlus size={13} aria-hidden="true" />
      New customer{newNote && ` · ${newNote}`}
    </p>
  );
};
