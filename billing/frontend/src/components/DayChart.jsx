import { useState } from 'react';
import { inr, inrShort } from '../lib/money.js';
import { CostLegend } from './CostBars.jsx';

const dayNum = new Intl.DateTimeFormat('en-IN', { day: 'numeric' });
const dayShort = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const TICKS = 4; // gridlines above zero

/** A tidy step (1, 2, 2.5 or 5 × a power of ten) so that TICKS steps reach at least the largest value. */
const niceStep = (v) => {
  if (v <= 0) return 1;
  const raw = v / TICKS;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= raw);
};

/**
 * Sales per day as columns: one series, so no legend; the card's title names it. The y-axis has five levels
 * and a caption; the x-axis numbers every day, names the month where it starts (or changes) and picks out
 * Sundays; a dashed line marks the average day. Each column is its own hover and focus target with a
 * tooltip, and the same numbers are in the table under the chart.
 *
 * With split (the admin), each column is the day's sales split into cost price (below) and gross profit (above),
 * on sales without GST when gst is on, so the two parts add up to the column. A day sold at a loss shows its
 * cost price alone, and the tooltip says so.
 */
const DayChart = ({ data, gst = true, split = false }) => {
  const [hover, setHover] = useState(null);
  const value = (d) => (split ? d.base : d.total);
  const step = niceStep(Math.max(...data.map((d) => (split ? Math.max(d.base, d.cost) : d.total))));
  const max = step * TICKS;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => max - i * step);
  const average = data.reduce((s, d) => s + value(d), 0) / (data.length || 1);
  const short = data.length <= 7; // a week: room for the weekday under each column

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 pl-15">
        <span className="text-[11px] text-ink-3">
          ₹ per day{gst && (split ? ', without GST' : ', incl. GST')}
        </span>
        {split && <CostLegend />}
      </div>
      <div className="relative flex gap-3">
        <div className="flex h-56 w-12 flex-col justify-between text-right text-[11px] text-ink-3 tabular-nums" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {inrShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* gridlines: hairline, solid, recessive; the baseline a step stronger */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-56 flex-col justify-between" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className={`h-px ${t === 0 ? 'bg-line-strong' : 'bg-line-soft'}`} />
            ))}
          </div>
          {/* the average day, dashed, labelled at the right end */}
          {average > 0 && (
            <div className="pointer-events-none absolute inset-x-0 z-1" style={{ top: `calc(14rem * ${1 - average / max})` }} aria-hidden="true">
              <div className="border-t border-dashed border-ink-3/60" />
              <span className="absolute right-0 -translate-y-full rounded bg-white/85 px-1 text-[11px] font-medium text-ink-2 tabular-nums">
                avg {inrShort(average)}
              </span>
            </div>
          )}
          <ul className="relative flex h-56 items-end gap-0.5" aria-label="Sales by day">
            {data.map((d, i) => {
              const v = value(d);
              const h = (v / max) * 100;
              const on = hover === i;
              const profit = d.base - d.cost;
              return (
                <li key={d.date.toISOString()} className="flex h-full flex-1 items-end justify-center">
                  <button
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={
                      split
                        ? `${weekday.format(d.date)}: sales ${inr(d.base)}, cost price ${inr(d.cost)}, gross profit ${inr(profit)}`
                        : `${weekday.format(d.date)}: ${inr(d.total)}`
                    }
                    className="group flex h-full w-full items-end justify-center focus-visible:outline-offset-0"
                  >
                    {split ? (
                      // cost price at the bottom, gross profit above it, a 2px gap between; only the top end is rounded
                      <span
                        className={`flex w-full max-w-6 flex-col-reverse gap-0.5 transition-opacity ${hover !== null && !on ? 'opacity-60' : ''}`}
                        style={{ height: `${Math.max((Math.max(d.base, d.cost) / max) * 100, d.base ? 1.5 : 0)}%` }}
                      >
                        <span
                          className={`block w-full bg-chart-cost ${profit > 0 ? 'rounded-t-[1px]' : 'rounded-t-[4px]'}`}
                          style={{ flexGrow: d.cost, flexBasis: 0 }}
                        />
                        {profit > 0 && <span className="block w-full rounded-t-[4px] bg-chart-profit" style={{ flexGrow: profit, flexBasis: 0 }} />}
                      </span>
                    ) : (
                      <span
                        className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${on ? 'bg-evergreen-900' : 'bg-evergreen-800'}`}
                        style={{ height: `${Math.max(h, d.total ? 1.5 : 0)}%` }}
                      />
                    )}
                  </button>
                  {on && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 animate-pop rounded-lg border border-line bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-[0_8px_24px_-6px_rgba(9,9,11,0.2)]"
                      style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
                    >
                      <div className="text-sm font-semibold tabular-nums">{inr(v)}</div>
                      <div className="text-[11px] text-ink-3">
                        {weekday.format(d.date)} · {v >= average ? 'above' : 'below'} average
                      </div>
                      {split && d.base > 0 && (
                        <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 border-t border-line-soft pt-1.5 text-xs tabular-nums">
                          <dt className="flex items-center gap-1.5 text-ink-2">
                            <span className="size-2 rounded-sm bg-chart-cost" aria-hidden="true" /> Cost price
                          </dt>
                          <dd className="text-right">{inr(d.cost)}</dd>
                          <dt className="flex items-center gap-1.5 text-ink-2">
                            <span className="size-2 rounded-sm bg-chart-profit" aria-hidden="true" /> {profit >= 0 ? 'Gross profit' : 'Loss'}
                          </dt>
                          <dd className={`text-right font-medium ${profit >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>
                            {inr(profit)} · {((profit / d.base) * 100).toFixed(1)}%
                          </dd>
                        </dl>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {/* x-axis: every day's date; the month where it starts or changes; Sundays darker */}
          <div className="mt-1.5 flex gap-0.5 text-[11px] leading-tight text-ink-3 tabular-nums" aria-hidden="true">
            {data.map((d, i) => {
              const sunday = d.date.getDay() === 0;
              const newMonth = i === 0 || d.date.getMonth() !== data[i - 1].date.getMonth();
              return (
                <span key={d.date.toISOString()} className={`flex min-w-0 flex-1 flex-col items-center ${sunday ? 'font-semibold text-ink-2' : ''}`}>
                  <span>{dayNum.format(d.date)}</span>
                  <span className={short || newMonth ? 'text-ink-2' : 'invisible'}>{short ? dayShort.format(d.date) : monthShort.format(d.date)}</span>
                </span>
              );
            })}
          </div>
          {!short && <div className="mt-1 text-right text-[11px] text-ink-3">Sundays in bold</div>}
        </div>
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-xs text-ink-3 hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full text-xs tabular-nums">
          {split && (
            <thead>
              <tr className="text-left text-ink-3">
                <th scope="col" className="py-1 font-medium">Day</th>
                <th scope="col" className="py-1 text-right font-medium">Sales</th>
                <th scope="col" className="py-1 text-right font-medium">Cost price</th>
                <th scope="col" className="py-1 text-right font-medium">Gross profit</th>
              </tr>
            </thead>
          )}
          <tbody>
            {data.map((d) => (
              <tr key={d.date.toISOString()} className="border-t border-line-soft">
                <td className="py-1">{weekday.format(d.date)}</td>
                <td className="py-1 text-right">{inr(value(d))}</td>
                {split && <td className="py-1 text-right">{inr(d.cost)}</td>}
                {split && <td className="py-1 text-right">{inr(d.base - d.cost)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default DayChart;
