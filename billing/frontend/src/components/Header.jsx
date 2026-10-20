import { MapPin } from 'lucide-react';
import logo from '../assets/logo-lockup.png';
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

const pill = 'rounded-full bg-white/[0.07] px-3 py-1.75 text-[13px]';

const Header = ({ now }) => (
  <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-pine-950 px-6 py-3.5 text-[#e9efea]">
    <div className="flex items-center gap-5">
      <img src={logo} alt={STORE.name} className="block h-7.5 w-auto" />
      <span className="h-7 w-px bg-gold-300/30" aria-hidden="true" />
      <span className="font-display text-[11px] font-semibold tracking-[0.22em] text-gold-300">BILLING</span>
    </div>
    <div className="flex flex-wrap items-center gap-2.5">
      <span className={`inline-flex items-center gap-2 ${pill}`}>
        <MapPin size={15} className="text-gold-300" aria-hidden="true" />
        {STORE.showroom}
      </span>
      <span className={pill}>{STORE.counter}</span>
      <span className="rounded-full border border-gold-300/55 px-3 py-1.5 text-xs font-semibold tracking-wide text-gold-300">
        Season {SEASON}
      </span>
      <time dateTime={now.toISOString()} className="px-1.5 text-[13px] text-[#b9c7be]">
        {dateTime.format(now).replace(' at ', ' · ')}
      </time>
    </div>
  </header>
);

export default Header;
