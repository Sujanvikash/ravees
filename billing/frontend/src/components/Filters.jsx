import { Search } from 'lucide-react';
import { LOCATIONS } from '../config.js';
import { PERIODS } from '../lib/reports.js';

const segment = (on) =>
  `h-7 rounded-[9px] px-3 text-xs font-medium whitespace-nowrap transition-colors ${
    on ? 'brand-gradient shadow-[0_1px_2px_rgba(9,9,11,0.15)]' : 'text-ink-3 hover:bg-white/70 hover:text-ink'
  }`;

/** A pill segmented control: options [{ id, label }]. */
export const Segmented = ({ label, options, value, onChange }) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-0.5 rounded-xl bg-mist p-0.5">
    {options.map((o) => (
      <button key={o.id ?? 'all'} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={segment(value === o.id)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const PeriodTabs = ({ value, onChange }) => <Segmented label="Period" options={PERIODS} value={value} onChange={onChange} />;

/** Showroom picker for the admin; `all` adds an "All showrooms" option whose value is null. */
export const LocationPicker = ({ value, onChange, all = true }) => (
  <Segmented
    label="Showroom"
    options={[...(all ? [{ id: null, label: 'All showrooms' }] : []), ...LOCATIONS.map((l) => ({ id: l.id, label: l.city }))]}
    value={value}
    onChange={onChange}
  />
);

export const SearchBox = ({ value, onChange, placeholder }) => (
  <label className="flex h-8 min-w-56 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-shadow focus-within:border-evergreen-800/50 focus-within:shadow-[0_0_0_3px_rgba(23,92,38,0.10)] sm:max-w-72">
    <Search size={15} className="text-ink-3" aria-hidden="true" />
    <span className="sr-only">{placeholder}</span>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-ink-3"
    />
  </label>
);
