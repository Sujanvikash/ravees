import { ChevronRight, HardDrive } from 'lucide-react';
import logo from '../assets/logo.svg';
import { STORE } from '../config.js';
import { SEASON } from '../lib/catalogue.js';
import { inrWhole } from '../lib/money.js';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const Sep = () => <ChevronRight size={14} className="text-line-strong" aria-hidden="true" />;

/** The slim top bar: logo, where this counter is, today's takings, the season and the clock. */
const Header = ({ now, todayCount, todayTotal }) => (
  <header className="flex h-14 shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-5">
    <div className="flex min-w-0 items-center gap-3 text-[13px]">
      <img src={logo} alt={`${STORE.name} · Christmas Tree & Decoration`} className="block h-9 w-auto" />
      <span className="ml-1 h-5 w-px bg-line" aria-hidden="true" />
      <nav aria-label="Counter" className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
        <span className="font-semibold text-ink">Billing</span>
        <Sep />
        <span className="text-ink-2">{STORE.showroom}</span>
        <Sep />
        <span className="text-ink-2">{STORE.counter}</span>
      </nav>
    </div>

    <div className="hidden items-center gap-4 text-[13px] whitespace-nowrap text-ink-3 md:flex">
      <span>
        Today <span className="font-medium text-ink tabular-nums">{inrWhole(todayTotal)}</span> · {todayCount}{' '}
        {todayCount === 1 ? 'bill' : 'bills'}
      </span>
      <span
        className="hidden items-center gap-1.5 lg:inline-flex"
        title="There is no billing server yet: bills are kept in this browser"
      >
        <HardDrive size={14} aria-hidden="true" /> Saved on this computer
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-2">
        <span className="size-1.5 rounded-full bg-raave-red" aria-hidden="true" />
        Season {SEASON}
      </span>
      <time dateTime={now.toISOString()} className="tabular-nums">
        {dateTime.format(now).replace(' at ', ', ')}
      </time>
    </div>
  </header>
);

export default Header;
