import { MapPin } from 'lucide-react';
import logo from '../assets/logo.svg';
import { STORE } from '../config.js';
import { SEASON } from '../lib/catalogue.js';

const dateTime = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const pill = 'rounded-full bg-mist px-2.5 py-1 text-xs text-ink-2';

// White, like the logo's own background, with the logo's green band as the bottom rule.
const Header = ({ now }) => (
  <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-[3px] border-evergreen-800 bg-surface px-4 py-1.5">
    <div className="flex items-center gap-4">
      <img src={logo} alt={`${STORE.name} · Christmas Tree & Decoration`} className="block h-11 w-auto" />
      <span className="h-8 w-px bg-line" aria-hidden="true" />
      <span className="font-display text-[13px] font-bold tracking-[0.18em] text-evergreen-800">BILLING</span>
    </div>
    <div className="flex flex-wrap items-center gap-2.5">
      <span className={`inline-flex items-center gap-2 ${pill}`}>
        <MapPin size={15} className="text-evergreen-800" aria-hidden="true" />
        {STORE.showroom}
      </span>
      <span className={pill}>{STORE.counter}</span>
      <span className="rounded-full border border-raave-red px-2.5 py-0.5 text-xs font-semibold tracking-wide text-raave-red-ink">
        Season {SEASON}
      </span>
      <time dateTime={now.toISOString()} className="px-1 text-xs text-ink-2">
        {dateTime.format(now).replace(' at ', ' · ')}
      </time>
    </div>
  </header>
);

export default Header;
