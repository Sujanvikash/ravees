import { LOCATIONS } from '../config.js';
import { cashIn, differenceTone } from '../lib/cash.js';
import { inr, inrWhole } from '../lib/money.js';

/**
 * Every showroom side by side for the period: total sales, the part taken in cash (green inside the grey total
 * bar, bars to the same scale so the showrooms compare), cash refunds, and what the cash closes found short or
 * over. Sales and refunds come from the bills themselves, so days not closed yet still count there. With a
 * `location`, only that showroom's row.
 */
const CashComparison = ({ sales, returns, closes, location = null }) => {
  const rows = LOCATIONS.filter((l) => (!location || l.id === location) && (l.active !== false || sales.some((s) => s.location === l.id))).map((l) => {
    const mine = sales.filter((s) => s.location === l.id);
    const shut = closes.filter((c) => c.location === l.id);
    return {
      l,
      total: mine.reduce((t, s) => t + s.totals.payable, 0),
      cash: mine.reduce((t, s) => t + cashIn(s.payment), 0),
      refunds: returns.filter((r) => r.location === l.id).reduce((t, r) => t + r.refund, 0),
      short: shut.filter((c) => c.difference <= -0.5).reduce((t, c) => t + c.difference, 0),
      over: shut.filter((c) => c.difference >= 0.5).reduce((t, c) => t + c.difference, 0),
      days: shut.length,
      off: shut.filter((c) => Math.abs(c.difference) >= 0.5).length,
    };
  });
  const max = Math.max(1, ...rows.map((r) => r.total));
  const sum = (key) => rows.reduce((t, r) => t + r[key], 0);
  const all = { total: sum('total'), cash: sum('cash'), refunds: sum('refunds'), short: sum('short'), over: sum('over'), days: sum('days'), off: sum('off') };
  const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

  const cells = (r) => (
    <>
      <td className="py-2 pr-3 text-right font-medium">{inrWhole(r.total)}</td>
      <td className="py-2 pr-3 text-right">
        <span className="font-semibold text-ok-ink">{inrWhole(r.cash)}</span> <span className="text-xs text-ink-3">{pct(r.cash, r.total)}</span>
      </td>
      <td className="py-2 pr-3 text-right text-ink-2">{inrWhole(r.total - r.cash)}</td>
      <td className="py-2 pr-3 text-right text-ink-2">{inrWhole(r.refunds)}</td>
      <td className={`py-2 pr-3 text-right font-semibold ${r.short ? 'text-ruby-ink' : 'text-ink-3'}`}>{r.short ? inr(-r.short) : '—'}</td>
      <td className={`py-2 pr-3 text-right font-semibold ${r.over ? 'text-warn-ink' : 'text-ink-3'}`}>{r.over ? inr(r.over) : '—'}</td>
      <td className={`py-2 pr-3 text-right font-semibold ${differenceTone(r.short + r.over)}`}>
        {Math.abs(r.short + r.over) < 0.5 ? '0' : `${r.short + r.over > 0 ? '+' : '−'}${inr(Math.abs(r.short + r.over))}`}
      </td>
      <td className="py-2 pr-4 text-right text-ink-2">
        {r.off} of {r.days}
      </td>
    </>
  );

  return (
    <section className="rounded-2xl border glass p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{location ? `${rows[0].l.label}: sales and cash` : 'Showrooms compared'}</h2>
        <div className="flex items-center gap-3 text-xs text-ink-2" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-ok" /> Cash sales
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-line-strong" /> UPI, card and exchange credit
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-line-soft text-left text-xs text-ink-3">
              <th className="py-1.5 pr-3 font-medium">Showroom</th>
              <th className="w-1/4 py-1.5 pr-3 font-medium">Total sales · cash part</th>
              <th className="py-1.5 pr-3 text-right font-medium">Total sales</th>
              <th className="py-1.5 pr-3 text-right font-medium">Cash sales</th>
              <th className="py-1.5 pr-3 text-right font-medium">UPI · card</th>
              <th className="py-1.5 pr-3 text-right font-medium">Cash refunds</th>
              <th className="py-1.5 pr-3 text-right font-medium">Short</th>
              <th className="py-1.5 pr-3 text-right font-medium">Over</th>
              <th className="py-1.5 pr-3 text-right font-medium">Net</th>
              <th className="py-1.5 pr-4 text-right font-medium">Days off</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.l.id} className="border-b border-line-soft">
                <td className="py-2 pr-3 font-medium">{r.l.label}</td>
                <td className="py-2 pr-3">
                  <span
                    className="flex h-3 overflow-hidden rounded-full bg-line-strong"
                    style={{ width: `${Math.max((r.total / max) * 100, r.total ? 2 : 0)}%` }}
                    role="img"
                    aria-label={`${r.l.label}: ${inrWhole(r.cash)} cash of ${inrWhole(r.total)} sales`}
                  >
                    <span className="h-full bg-ok" style={{ width: `${r.total ? (r.cash / r.total) * 100 : 0}%` }} />
                  </span>
                </td>
                {cells(r)}
              </tr>
            ))}
            {rows.length > 1 && (
              <tr className="font-semibold">
                <td className="py-2 pr-3">All showrooms</td>
                <td />
                {cells(all)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Short and over come from the daily cash closes; "Days off" is how many closed days didn’t balance. Net = over − short.
      </p>
    </section>
  );
};

export default CashComparison;
