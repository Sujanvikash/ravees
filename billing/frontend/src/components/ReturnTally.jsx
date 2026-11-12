import { useState } from 'react';
import { inr } from '../lib/money.js';
import { returnTally } from '../lib/orders.js';

const pcs = (n) => `${n.toLocaleString('en-IN')} pcs`;

/** One figure of a return: its units and their value at D.Rate. */
const Tile = ({ label, sum, tone = 'plain', hint }) => {
  const tones = {
    ok: 'border-evergreen-800/20 bg-evergreen-50 text-evergreen-900',
    warn: 'border-ruby/20 bg-ruby-50 text-ruby-ink',
    plain: 'border-line-soft bg-surface text-ink',
  };
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${tones[tone]}`}>
      <div className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 tabular-nums">
        <span className="text-lg font-semibold">{pcs(sum.units)}</span>
        <span className="text-[13px] font-medium">{inr(sum.value)}</span>
      </div>
      {hint && <div className="mt-0.5 text-[11px] opacity-75">{hint}</div>}
    </div>
  );
};

/**
 * A purchase return as the admin reads it: how much the showroom returned and how much it didn't (what it had and
 * kept), in units and in value at D.Rate, and once counted in, what arrived and what is missing; then every product,
 * with what it had, returned and kept, the ones it kept first-to-hand behind "Not returned only". A return sent
 * before what the showroom had was kept on it shows only what was returned.
 */
const ReturnTally = ({ doc, shop }) => {
  const tally = returnTally(doc);
  const [onlyKept, setOnlyKept] = useState(false);
  const keptRows = tally.rows.filter((row) => row.notReturned > 0);
  const rows = onlyKept ? keptRows : tally.rows;
  const counted = Boolean(tally.arrived);
  const had = { units: tally.returned.units + tally.notReturned.units, value: tally.returned.value + tally.notReturned.value };

  return (
    <div className="flex flex-col gap-2.5">
      <div className={`grid gap-2 sm:grid-cols-2 ${counted ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <Tile label="Returned" sum={tally.returned} tone="ok" hint="Sent back to you" />
        {tally.known ? (
          <Tile
            label="Not returned"
            sum={tally.notReturned}
            tone={tally.notReturned.units ? 'warn' : 'plain'}
            hint={
              tally.notReturned.units ? `Kept at ${shop}: ${keptRows.length} ${keptRows.length === 1 ? 'product' : 'products'}` : `${shop} kept nothing back`
            }
          />
        ) : (
          <div className="rounded-xl border border-dashed border-line px-3.5 py-2.5 text-xs text-ink-3">
            Not returned: not known for a return sent before 12 Nov 2026 (what the showroom had wasn&rsquo;t kept then).
          </div>
        )}
        {counted ? (
          <>
            <Tile label="Arrived" sum={tally.arrived} tone="plain" hint="Counted in by you" />
            <Tile label="Missing" sum={tally.missing} tone={tally.missing.units ? 'warn' : 'plain'} hint="Sent, but didn’t arrive" />
          </>
        ) : (
          tally.known && <Tile label={`Had at ${shop}`} sum={had} hint="Returned + not returned" />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line-soft bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-3 py-2 text-xs text-ink-3">
          <span>{tally.rows.length} products · valued at D.Rate (the cost price), no GST</span>
          {keptRows.length > 0 && (
            <label className="flex cursor-pointer items-center gap-1.5 font-medium text-ink-2">
              <input type="checkbox" checked={onlyKept} onChange={(e) => setOnlyKept(e.target.checked)} className="size-3.5 accent-evergreen-800" />
              Not returned only ({keptRows.length})
            </label>
          )}
        </div>
        <div className="max-h-[26rem] overflow-auto">
          <table className="w-full min-w-[46rem] text-[13px] tabular-nums">
            <thead className="sticky top-0 z-1 bg-mist-2 text-xs text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-left font-medium">
                  Product
                </th>
                {tally.known && (
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">
                    Had
                  </th>
                )}
                <th scope="col" className="px-2 py-1.5 text-right font-medium">
                  Returned
                </th>
                {tally.known && (
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">
                    Not returned
                  </th>
                )}
                {counted && (
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">
                    Arrived
                  </th>
                )}
                <th scope="col" className="px-2 py-1.5 text-right font-medium">
                  D. Rate
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">
                  Returned value
                </th>
                {tally.known && (
                  <th scope="col" className="px-3 py-1.5 text-right font-medium">
                    Not returned value
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const missing = counted && row.arrived != null && row.arrived < row.returned;
                return (
                  <tr key={row.code} className={`border-t border-line-soft ${row.notReturned > 0 ? 'bg-ruby-50/60' : ''}`}>
                    <td className="max-w-[20rem] px-3 py-1.5">
                      <span className="mr-2 rounded-md bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{row.code}</span>
                      <span className="truncate">{row.name}</span>
                    </td>
                    {tally.known && <td className="px-2 py-1.5 text-right text-ink-2">{row.held ?? '—'}</td>}
                    <td className="px-2 py-1.5 text-right font-medium">{row.returned}</td>
                    {tally.known && (
                      <td className={`px-2 py-1.5 text-right ${row.notReturned ? 'font-semibold text-ruby-ink' : 'text-ink-3'}`}>{row.notReturned || '—'}</td>
                    )}
                    {counted && <td className={`px-2 py-1.5 text-right ${missing ? 'font-semibold text-warn-ink' : ''}`}>{row.arrived ?? '—'}</td>}
                    <td className="px-2 py-1.5 text-right text-ink-2">{inr(row.rate)}</td>
                    <td className="px-2 py-1.5 text-right">{row.returned ? inr(row.returned * row.rate) : '—'}</td>
                    {tally.known && (
                      <td className={`px-3 py-1.5 text-right ${row.notReturned ? 'font-medium text-ruby-ink' : 'text-ink-3'}`}>
                        {row.notReturned ? inr(row.notReturned * row.rate) : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {!onlyKept && (
              <tfoot className="sticky bottom-0 bg-mist-2 font-semibold">
                <tr className="border-t border-line">
                  <td className="px-3 py-1.5">Total</td>
                  {tally.known && <td className="px-2 py-1.5 text-right">{had.units.toLocaleString('en-IN')}</td>}
                  <td className="px-2 py-1.5 text-right">{tally.returned.units.toLocaleString('en-IN')}</td>
                  {tally.known && <td className="px-2 py-1.5 text-right text-ruby-ink">{tally.notReturned.units.toLocaleString('en-IN')}</td>}
                  {counted && <td className="px-2 py-1.5 text-right">{tally.arrived.units.toLocaleString('en-IN')}</td>}
                  <td />
                  <td className="px-2 py-1.5 text-right">{inr(tally.returned.value)}</td>
                  {tally.known && <td className="px-3 py-1.5 text-right text-ruby-ink">{inr(tally.notReturned.value)}</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReturnTally;
