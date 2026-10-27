import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Repeat, Search, Undo2 } from 'lucide-react';
import { formatMobile } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import Dialog from './Dialog.jsx';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const primary =
  'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-evergreen-800 text-[14px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3';
const secondary =
  'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-evergreen-800/25 bg-white text-[14px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-40';

/**
 * Returns and exchanges at the counter, against an earlier bill of this showroom:
 *   1. find the bill (by its number, the customer's mobile or name);
 *   2. choose what comes back, and why;
 *   3. either refund it in cash (whatever the bill was paid with: a UPI or card payment is refunded in cash too),
 *      or exchange it: the returned value becomes a credit on the next bill rung up at the counter. If the new
 *      bill is bigger the customer pays the rest; if smaller, the difference is refunded in cash.
 * Only what was on the bill, and not returned already, can come back, within the admin's return window.
 */
const ReturnDialog = ({ location, sales, findBill, onRefund, onExchange, onClose }) => {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // { sale, lines, returnableUntil, open }
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const recent = sales
    .filter((s) => s.location === location)
    .filter((s) => !q || s.billNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (digits.length >= 4 && s.phone.includes(digits)))
    .slice(-200)
    .reverse()
    .slice(0, 12);

  const open = async (billNo) => {
    setBusy(true);
    setError('');
    try {
      const bill = await findBill(billNo);
      setFound(bill);
      setQty({});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const lines = found ? found.lines.map((l) => ({ ...l, left: l.sold - l.returned, qty: qty[l.code] ?? 0 })) : [];
  const chosen = lines.filter((l) => l.qty > 0);
  const value = Math.round(chosen.reduce((s, l) => s + l.price * l.qty, 0));
  const bump = (code, by, left) => setQty((m) => ({ ...m, [code]: Math.min(Math.max((m[code] ?? 0) + by, 0), left) }));
  const body = () => ({ saleId: found.sale.id, lines: chosen.map((l) => ({ code: l.code, qty: l.qty })), reason: reason.trim() });

  const refund = async () => {
    setBusy(true);
    setError('');
    try {
      await onRefund(body());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      id="return"
      title={found ? `Return against ${found.sale.billNo}` : 'Return or exchange'}
      subtitle={found ? `${found.sale.name} · ${formatMobile(found.sale.phone)} · ${when.format(new Date(found.sale.at))}` : 'Find the bill the items were bought on'}
      onClose={onClose}
      size="max-w-2xl"
    >
      <div className="flex flex-col gap-3 px-6 pb-6">
        {!found ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.includes('/')) open(query.trim());
                else if (recent[0]) open(recent[0].billNo);
              }}
            >
              <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-evergreen-800/50">
                <Search size={15} className="text-ink-3" aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bill number (scan it from the receipt), mobile or name"
                  aria-label="Find the bill"
                  className="min-w-0 flex-1 bg-transparent text-sm"
                />
              </label>
            </form>
            <ul className="flex max-h-80 flex-col overflow-y-auto">
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => open(s.billNo)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-mist"
                  >
                    <span className="font-mono text-xs text-ink-2">{s.billNo}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-ink-3">{when.format(new Date(s.at))}</span>
                    <span className="w-24 text-right font-medium tabular-nums">{inr(s.totals.payable)}</span>
                  </button>
                </li>
              ))}
              {!recent.length && <li className="px-3 py-6 text-center text-[13px] text-ink-3">No bill matches.</li>}
            </ul>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFound(null)}
              className="-ml-1.5 inline-flex h-8 w-fit items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-medium text-ink-3 hover:bg-mist hover:text-ink"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Another bill
            </button>
            {!found.open && (
              <p className="rounded-xl bg-warn-50 px-3.5 py-2.5 text-[13px] font-medium text-warn-ink">
                {found.returnableUntil
                  ? `This bill could be returned until ${day.format(new Date(found.returnableUntil))}; that has passed.`
                  : 'Returns and exchanges are switched off in Settings.'}
              </p>
            )}
            <table className="w-full text-[13px] tabular-nums">
              <thead>
                <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                  <th className="py-1.5 pr-3 font-medium">Product</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Bought</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Rate</th>
                  <th className="py-1.5 text-right font-medium">Coming back</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.code} className="border-b border-line-soft">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="font-mono text-[11px] text-ink-3">
                        {l.code}
                        {l.returned > 0 && ` · ${l.returned} already returned`}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">{l.sold}</td>
                    <td className="py-2 pr-3 text-right">{inr(l.price)}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        <button type="button" aria-label={`One less ${l.name}`} disabled={!found.open || l.qty === 0} onClick={() => bump(l.code, -1, l.left)} className="inline-flex size-7 items-center justify-center rounded-lg border border-line enabled:hover:bg-mist disabled:opacity-40">
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center font-semibold">{l.qty}</span>
                        <button type="button" aria-label={`One more ${l.name}`} disabled={!found.open || l.qty >= l.left} onClick={() => bump(l.code, 1, l.left)} className="inline-flex size-7 items-center justify-center rounded-lg border border-line enabled:hover:bg-mist disabled:opacity-40">
                          <Plus size={13} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional), e.g. wrong size, damaged"
              aria-label="Reason"
              disabled={!found.open}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px]"
            />

            <div className="flex items-baseline justify-between rounded-xl bg-mist px-4 py-3">
              <span className="text-[13px] text-ink-2">Value of the items coming back</span>
              <span className="text-xl font-semibold tabular-nums">{inr(value)}</span>
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-ruby-ink">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className={secondary} disabled={busy || !chosen.length} onClick={() => onExchange({ ...body(), value, bill: found.sale })}>
                <Repeat size={16} aria-hidden="true" /> Exchange for other items
              </button>
              <button type="button" className={primary} disabled={busy || !chosen.length} onClick={refund}>
                <Undo2 size={16} aria-hidden="true" /> Refund {inr(value)} in cash
              </button>
            </div>
            <p className="text-xs text-ink-3">
              Refunds are always paid in cash, also for bills paid by UPI or card. For an exchange the value comes off the next bill; if that bill is smaller, the rest is refunded in cash.
            </p>
          </>
        )}
        {!found && error && (
          <p role="alert" className="text-xs font-medium text-ruby-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
};

export default ReturnDialog;
