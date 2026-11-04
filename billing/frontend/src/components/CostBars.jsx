import { useState } from 'react';
import { inr, inrWhole } from '../lib/money.js';

const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** The two parts every cost chart splits sales into; shown above each chart, so colour is never the only key. */
export const CostLegend = () => (
  <div className="flex items-center gap-3 text-xs text-ink-2">
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm bg-chart-cost" aria-hidden="true" /> Cost price
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm bg-chart-profit" aria-hidden="true" /> Gross profit
    </span>
  </div>
);

/**
 * Sales against cost price, one bar per row (showroom or product): the bar is the sales (without GST when gst is
 * on), split into cost price and gross profit with a 2px gap, so the green part is the margin at a glance. The
 * sales figure and margin sit beside each bar; hovering or focusing a row shows all three numbers, and the same
 * numbers are in the table under the chart. A row sold at a loss shows its cost price alone, its margin in red.
 * rows: [{ key, label, code?, base, cost }], ordered as they should be shown.
 */
const CostBars = ({ rows, gst = true, onSelect, selected = null }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(0, ...rows.map((r) => Math.max(r.base, r.cost)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-ink-3">₹ sales{gst && ', without GST'} · margin on the right</span>
        <CostLegend />
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => {
          const profit = r.base - r.cost;
          const margin = r.base ? profit / r.base : 0;
          const on = hover === r.key;
          const width = max ? (Math.max(r.base, r.cost) / max) * 100 : 0;
          return (
            <li key={r.key} className="relative">
              <button
                type="button"
                onClick={onSelect ? () => onSelect(r.key) : undefined}
                onMouseEnter={() => setHover(r.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.key)}
                onBlur={() => setHover(null)}
                aria-label={`${r.label}: sales ${inr(r.base)}, cost price ${inr(r.cost)}, gross profit ${inr(profit)}, margin ${pct(margin)}`}
                aria-pressed={onSelect ? selected === r.key : undefined}
                className={`grid w-full grid-cols-[minmax(0,15rem)_1fr_6.5rem_3.5rem] items-center gap-x-3 rounded-lg px-1.5 py-1.5 text-left text-[13px] tabular-nums ${
                  on || selected === r.key ? 'bg-mist' : ''
                }`}
              >
                <span className="min-w-0 truncate" title={r.label}>
                  {r.code && <span className="mr-2 rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{r.code}</span>}
                  {r.label}
                </span>
                <span className="flex h-3.5 items-stretch">
                  <span className="flex gap-0.5" style={{ width: `${Math.max(width, r.base ? 1 : 0)}%` }}>
                    <span className={`bg-chart-cost ${profit > 0 ? 'rounded-r-[1px]' : 'rounded-r-[4px]'}`} style={{ flexGrow: r.cost, flexBasis: 0 }} />
                    {profit > 0 && <span className="rounded-r-[4px] bg-chart-profit" style={{ flexGrow: profit, flexBasis: 0 }} />}
                  </span>
                </span>
                <span className="text-right font-medium">{inrWhole(r.base)}</span>
                <span className={`text-right text-xs font-medium ${profit >= 0 ? 'text-ink-2' : 'text-ruby-ink'}`}>{pct(margin)}</span>
              </button>
              {on && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-[16rem] z-10 mb-1 animate-pop rounded-lg border border-line bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-[0_8px_24px_-6px_rgba(9,9,11,0.2)]"
                >
                  <div className="text-[11px] text-ink-3">{r.label}</div>
                  <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs tabular-nums">
                    <dt className="text-ink-2">Sales{gst && ' without GST'}</dt>
                    <dd className="text-right font-semibold">{inr(r.base)}</dd>
                    <dt className="flex items-center gap-1.5 text-ink-2">
                      <span className="size-2 rounded-sm bg-chart-cost" aria-hidden="true" /> Cost price
                    </dt>
                    <dd className="text-right">{inr(r.cost)}</dd>
                    <dt className="flex items-center gap-1.5 text-ink-2">
                      <span className="size-2 rounded-sm bg-chart-profit" aria-hidden="true" /> {profit >= 0 ? 'Gross profit' : 'Loss'}
                    </dt>
                    <dd className={`text-right font-medium ${profit >= 0 ? 'text-ok-ink' : 'text-ruby-ink'}`}>
                      {inr(profit)} · {pct(margin)}
                    </dd>
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-xs text-ink-3 hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full text-xs tabular-nums">
          <thead>
            <tr className="text-left text-ink-3">
              <th scope="col" className="py-1 font-medium" />
              <th scope="col" className="py-1 text-right font-medium">Sales{gst && ' without GST'}</th>
              <th scope="col" className="py-1 text-right font-medium">Cost price</th>
              <th scope="col" className="py-1 text-right font-medium">Gross profit</th>
              <th scope="col" className="py-1 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line-soft">
                <td className="py-1">{r.code ? `${r.code} · ${r.label}` : r.label}</td>
                <td className="py-1 text-right">{inr(r.base)}</td>
                <td className="py-1 text-right">{inr(r.cost)}</td>
                <td className="py-1 text-right">{inr(r.base - r.cost)}</td>
                <td className="py-1 text-right">{r.base ? pct((r.base - r.cost) / r.base) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default CostBars;
