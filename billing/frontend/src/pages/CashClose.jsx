import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { CircleCheck, Wallet } from 'lucide-react';
import { LocationPicker } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { LOCATIONS, locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { differenceLabel, differenceTone } from '../lib/cash.js';
import { inr, parseAmount } from '../lib/money.js';

const NOTES = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Today in India as YYYY-MM-DD (the server's days are IST too). */
const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

const field = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px] tabular-nums';

/** Tiles of the day's cash as the bills have it. */
const DayFigures = ({ day, opening }) => (
  <SummaryStrip
    figures={[
      { label: 'Opening float', value: inr(opening), note: 'in the drawer at the start' },
      { label: 'Cash from bills', value: inr(day.cashSales), note: `${day.bills} bills today · cash and the cash part of split` },
      { label: 'Cash refunds', value: inr(day.cashRefunds), note: 'returns and exchanges' },
      { label: 'Should be in the drawer', value: inr(opening + day.cashSales - day.cashRefunds) },
      { label: 'UPI · card', value: `${inr(day.upi)} · ${inr(day.card)}`, note: 'not in the drawer' },
    ]}
  />
);

/** A showroom counts its drawer at the end of the day and closes it; the difference goes to the admin. */
const CloseForm = ({ onClosed }) => {
  const { cashDay, closeDay, sales } = useStore();
  const [date, setDate] = useState(todayIST);
  const [day, setDay] = useState(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');
  const [count, setCount] = useState({}); // notes and coins
  const [counted, setCounted] = useState(''); // typed instead of counting notes
  const [floatNext, setFloatNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchDay = useEffectEvent(() =>
    cashDay(null, date).then(
      (d) => {
        setDay(d);
        setOpening(String(d.opening));
        setFloatNext(String(d.opening));
      },
      (e) => setError(e.message),
    ),
  );
  // again when the day changes, and when a new bill comes in
  useEffect(() => {
    fetchDay();
  }, [date, sales.length]);

  const fromNotes = NOTES.reduce((t, n) => t + n * (Number(count[n]) || 0), 0);
  const total = counted.trim() ? parseAmount(counted) : fromNotes;
  const open = parseAmount(opening || '0');
  const expected = day ? open + day.cashSales - day.cashRefunds : 0;
  const difference = total - expected;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!(total >= 0)) return setError('Count the cash in the drawer.');
    setBusy(true);
    try {
      const saved = await closeDay({
        day: date,
        opening: open,
        counted: total,
        floatNext: parseAmount(floatNext || '0'),
        denominations: Object.fromEntries(NOTES.filter((n) => Number(count[n]) > 0).map((n) => [String(n), Number(count[n])])),
        note: note.trim(),
      });
      setDay((d) => ({ ...d, closed: saved }));
      onClosed(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!day) return <p className="text-[13px] text-ink-3">{error || 'Loading the day’s cash…'}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[13px] font-medium text-ink-2" htmlFor="close-day">
          Day
        </label>
        <input id="close-day" type="date" value={date} max={todayIST()} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 rounded-xl border border-line bg-white px-3 text-[13px]" />
      </div>

      <DayFigures day={day} opening={day.closed ? day.closed.opening : open} />

      {day.closed ? (
        <section className="rounded-2xl border glass p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <CircleCheck size={17} className="text-ok-ink" aria-hidden="true" /> {dayLabel.format(new Date(day.day))} is closed
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            Counted {inr(day.closed.counted)} against {inr(day.closed.expected)} expected ·{' '}
            <span className={`font-semibold ${differenceTone(day.closed.difference)}`}>{differenceLabel(day.closed.difference)}</span> · {inr(day.closed.floatNext)} kept for the next
            day · closed at {time.format(new Date(day.closed.at))}
          </p>
        </section>
      ) : (
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border glass p-5 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Count the drawer</h2>
            <p className="mb-3 text-xs text-ink-3">Count each note and coin, or type the total below.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {NOTES.map((n) => (
                <label key={n} className="flex flex-col gap-1 rounded-xl border border-line bg-white p-2">
                  <span className="text-xs font-medium text-ink-2">₹{n}</span>
                  <input
                    inputMode="numeric"
                    value={count[n] ?? ''}
                    onChange={(e) => setCount((c) => ({ ...c, [n]: e.target.value.replace(/\D/g, '') }))}
                    aria-label={`Number of ₹${n}`}
                    placeholder="0"
                    className="h-8 w-full bg-transparent text-[15px] font-semibold tabular-nums"
                  />
                  <span className="text-[11px] text-ink-3 tabular-nums">{inr(n * (Number(count[n]) || 0))}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-ink-2">
              Opening float
              <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} className={`mt-1 ${field}`} />
            </label>
            <label className="text-[13px] font-medium text-ink-2">
              Cash counted
              <input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder={inr(fromNotes)} className={`mt-1 ${field}`} />
            </label>
            <label className="text-[13px] font-medium text-ink-2">
              Kept in the drawer for tomorrow
              <input inputMode="decimal" value={floatNext} onChange={(e) => setFloatNext(e.target.value)} className={`mt-1 ${field}`} />
            </label>
            <div className="rounded-xl bg-mist px-4 py-3">
              <div className="flex justify-between text-[13px] text-ink-2">
                <span>Expected</span>
                <span className="tabular-nums">{inr(expected)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-ink-2">
                <span>Counted</span>
                <span className="tabular-nums">{inr(total)}</span>
              </div>
              <div className={`mt-1 flex justify-between text-[15px] font-semibold ${differenceTone(difference)}`}>
                <span>Difference</span>
                <span className="tabular-nums">{differenceLabel(difference)}</span>
              </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={Math.abs(difference) >= 0.5 ? 'Why it doesn’t balance (the admin sees this)' : 'Note (optional)'} aria-label="Note" className={field} />
            {error && (
              <p role="alert" className="text-xs font-medium text-ruby-ink">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="h-11 rounded-xl bg-evergreen-800 text-[14px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60">
              Close the day
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

/** Closed days, newest first, with their difference. */
const ClosesTable = ({ list, showShop }) =>
  list.length === 0 ? (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Wallet size={22} className="text-ink-3" aria-hidden="true" />
      <div className="text-[15px] font-semibold">No days closed yet</div>
      <div className="text-[13px] text-ink-3">Each showroom closes its day here after counting the drawer.</div>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
        <thead>
          <tr className="border-b border-line-soft text-left text-xs text-ink-3">
            <th className="py-2 pr-3 pl-4 font-medium">Day</th>
            {showShop && <th className="py-2 pr-3 font-medium">Showroom</th>}
            <th className="py-2 pr-3 text-right font-medium">Opening</th>
            <th className="py-2 pr-3 text-right font-medium">Cash from bills</th>
            <th className="py-2 pr-3 text-right font-medium">Refunds</th>
            <th className="py-2 pr-3 text-right font-medium">Expected</th>
            <th className="py-2 pr-3 text-right font-medium">Counted</th>
            <th className="py-2 pr-3 text-right font-medium">Difference</th>
            <th className="py-2 pr-4 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="row-hover border-b border-line-soft">
              <td className="py-1.5 pr-3 pl-4 whitespace-nowrap">{dayLabel.format(new Date(c.day))}</td>
              {showShop && <td className="py-1.5 pr-3 font-medium">{locationById(c.location)?.city}</td>}
              <td className="py-1.5 pr-3 text-right text-ink-2">{inr(c.opening)}</td>
              <td className="py-1.5 pr-3 text-right text-ink-2">{inr(c.cashSales)}</td>
              <td className="py-1.5 pr-3 text-right text-ink-2">{inr(c.cashRefunds)}</td>
              <td className="py-1.5 pr-3 text-right">{inr(c.expected)}</td>
              <td className="py-1.5 pr-3 text-right">{inr(c.counted)}</td>
              <td className={`py-1.5 pr-3 text-right font-semibold ${differenceTone(c.difference)}`}>{differenceLabel(c.difference)}</td>
              <td className="max-w-72 truncate py-1.5 pr-4 text-ink-3" title={c.note}>
                {c.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

/**
 * The daily cash close. A showroom counts the cash in its drawer at the end of the day; the server works out what
 * should be there (opening float + cash from bills − cash refunds) and keeps the difference. The admin sees every
 * showroom's closes, which days didn't balance, and which showrooms haven't closed today yet.
 */
const CashClose = ({ session, onMenu }) => {
  const admin = session.role === 'admin';
  const { closes } = useStore();
  const [location, setLocation] = useState(admin ? null : session.location);
  const [flash, setFlash] = useState('');
  const list = useMemo(
    () => closes.filter((c) => !location || c.location === location).sort((a, b) => (a.day === b.day ? a.location.localeCompare(b.location) : a.day < b.day ? 1 : -1)),
    [closes, location],
  );
  const today = todayIST();
  const shop = locationById(session.location);
  const month = list.filter((c) => (new Date(today) - new Date(c.day)) / 86_400_000 <= 30);
  const short = month.filter((c) => c.difference <= -0.5).reduce((t, c) => t + c.difference, 0);
  const over = month.filter((c) => c.difference >= 0.5).reduce((t, c) => t + c.difference, 0);
  const notClosed = LOCATIONS.filter((l) => (!location || l.id === location) && !closes.some((c) => c.location === l.id && c.day === today));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={[admin ? (location ? locationById(location).city : 'All showrooms') : `${shop.city} · ${shop.area}`, admin ? 'Cash check' : 'Cash close']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          {admin ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <LocationPicker value={location} onChange={setLocation} />
              </div>
              <SummaryStrip
                figures={[
                  { label: 'Days closed · last 30 days', value: month.length.toLocaleString('en-IN') },
                  { label: 'Not balanced', value: month.filter((c) => Math.abs(c.difference) >= 0.5).length.toLocaleString('en-IN'), note: 'days with a difference' },
                  { label: 'Cash short', value: inr(-short), tone: short < 0 ? 'bad' : undefined },
                  { label: 'Cash over', value: inr(over) },
                  { label: 'Not closed today', value: notClosed.length ? notClosed.map((l) => l.city).join(', ') : 'All closed' },
                ]}
              />
            </>
          ) : (
            <CloseForm onClosed={(c) => setFlash(`Day closed · ${differenceLabel(c.difference)}.`)} />
          )}
          {flash && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok-ink">
              <CircleCheck size={15} aria-hidden="true" /> {flash}
            </p>
          )}
          <section className="overflow-clip rounded-2xl border glass">
            <div className="border-b border-line-soft px-4 py-2.5 text-[13px] text-ink-3">{list.length.toLocaleString('en-IN')} closed days</div>
            <ClosesTable list={list} showShop={admin && !location} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default CashClose;
