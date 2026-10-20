import { useState } from 'react';
import { inr, inrShort } from '../lib/money.js';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** A tidy axis maximum (1, 2 or 5 × a power of ten) at or above the largest value. */
const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v);
};

/**
 * Sales per day as columns: one series, so no legend; the card's title names it. Each column is its own
 * hover and focus target with a tooltip, and the same numbers are in the table under the chart.
 */
const DayChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.total)));
  const ticks = [max, max / 2, 0];
  const labelEvery = data.length > 14 ? 5 : data.length > 7 ? 2 : 1;

  return (
    <div>
      <div className="relative flex gap-3">
        <div className="flex h-48 w-12 flex-col justify-between text-right text-[11px] text-ink-3 tabular-nums" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {inrShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* gridlines: hairline, solid, recessive */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="h-px bg-line-soft" />
            ))}
          </div>
          <ul className="relative flex h-48 items-end gap-0.5" aria-label="Sales by day">
            {data.map((d, i) => {
              const h = (d.total / max) * 100;
              const on = hover === i;
              return (
                <li key={d.date.toISOString()} className="flex h-full flex-1 items-end justify-center">
                  <button
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={`${weekday.format(d.date)}: ${inr(d.total)}`}
                    className="group flex h-full w-full items-end justify-center focus-visible:outline-offset-0"
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${on ? 'bg-evergreen-900' : 'bg-evergreen-800'}`}
                      style={{ height: `${Math.max(h, d.total ? 1.5 : 0)}%` }}
                    />
                  </button>
                  {on && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 animate-pop rounded-lg border border-line bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-[0_8px_24px_-6px_rgba(9,9,11,0.2)]"
                      style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
                    >
                      <div className="text-sm font-semibold tabular-nums">{inr(d.total)}</div>
                      <div className="text-[11px] text-ink-3">{weekday.format(d.date)}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1.5 flex gap-0.5 text-[11px] text-ink-3" aria-hidden="true">
            {data.map((d, i) => (
              <span key={d.date.toISOString()} className="flex-1 text-center whitespace-nowrap">
                {i % labelEvery === 0 || i === data.length - 1 ? day.format(d.date) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-xs text-ink-3 hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full text-xs tabular-nums">
          <tbody>
            {data.map((d) => (
              <tr key={d.date.toISOString()} className="border-t border-line-soft">
                <td className="py-1">{weekday.format(d.date)}</td>
                <td className="py-1 text-right">{inr(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default DayChart;
