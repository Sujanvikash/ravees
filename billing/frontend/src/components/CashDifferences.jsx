import { Wallet } from 'lucide-react';
import { locationById } from '../config.js';
import { differenceLabel, differenceTone } from '../lib/cash.js';

const day = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** The admin's glance at the tills: the last week's cash closes that didn't balance, newest first. */
const CashDifferences = ({ closes, location, onOpen }) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const week = closes.filter((c) => (!location || c.location === location) && new Date(c.day) >= since);
  if (!week.length) return null;
  const off = week.filter((c) => Math.abs(c.difference) >= 0.5);
  const net = off.reduce((t, c) => t + c.difference, 0);

  return (
    <section className="rounded-2xl border glass p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Wallet size={16} aria-hidden="true" /> Cash check · last 7 days
        </h2>
        <button type="button" onClick={onOpen} className="text-xs font-semibold text-evergreen-800 hover:underline">
          All cash closes →
        </button>
      </div>
      {off.length === 0 ? (
        <p className="text-[13px] text-ok-ink">All {week.length} days closed balanced.</p>
      ) : (
        <>
          <p className="mb-2 text-[13px] text-ink-2">
            {off.length} of {week.length} closed days didn’t balance · net <span className={`font-semibold ${differenceTone(net)}`}>{differenceLabel(net)}</span>
          </p>
          <ul className="flex flex-col divide-y divide-line-soft text-[13px]">
            {off
              .slice()
              .sort((a, b) => (a.day < b.day ? 1 : -1))
              .slice(0, 6)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-28 text-ink-3">{day.format(new Date(c.day))}</span>
                  <span className="flex-1 font-medium">{locationById(c.location)?.city}</span>
                  {c.note && <span className="hidden max-w-64 truncate text-xs text-ink-3 sm:inline">{c.note}</span>}
                  <span className={`w-32 text-right font-semibold tabular-nums ${differenceTone(c.difference)}`}>{differenceLabel(c.difference)}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default CashDifferences;
