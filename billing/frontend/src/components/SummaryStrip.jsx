import { useStore } from '../context/StoreContext.jsx';

// Attention colours: light ones on the green strip, ordinary ones on the white strip (Light theme option).
const TONE = {
  green: { warn: { dot: 'bg-amber-300', value: 'text-amber-200' }, bad: { dot: 'bg-red-300', value: 'text-red-200' } },
  white: { warn: { dot: 'bg-amber-500', value: 'text-warn-ink' }, bad: { dot: 'bg-ruby', value: 'text-ruby-ink' } },
};
const TEXT = {
  green: { label: 'text-[rgb(255_255_255/0.75)]', note: 'text-[rgb(255_255_255/0.6)]', value: 'text-[#fff]', border: 'border-[rgb(255_255_255/0.15)]' },
  white: { label: 'text-ink-3', note: 'text-ink-3', value: 'text-ink', border: 'border-line' },
};

/** One figure in the strip; `tone` adds a coloured dot and number, for figures that need attention. */
const Figure = ({ label, value, note, tone, lead = false, look }) => {
  const t = TONE[look][tone];
  const c = TEXT[look];
  return (
    // a phone shows each figure as one row (name and note left, number right); wider screens stack them
    <div className={`flex min-w-0 items-center justify-between gap-3 px-4 py-2.5 not-last:border-b sm:flex-col sm:items-start sm:justify-center sm:gap-0 lg:not-last:border-b-0 lg:not-first:border-l ${c.border}`}>
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 text-[13px] ${c.label}`}>
          {t && <span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />}
          {label}
        </span>
        {note && <span className={`block truncate text-xs sm:hidden ${c.note}`}>{note}</span>}
      </span>
      <span
        className={`font-semibold tracking-tight tabular-nums ${lead ? 'text-2xl' : 'text-xl'} ${t?.value ?? (lead && look === 'white' ? 'text-evergreen-900' : c.value)}`}
      >
        {value}
      </span>
      {note && <span className={`hidden max-w-full truncate text-xs sm:block ${c.note}`}>{note}</span>}
    </div>
  );
};

/**
 * A page's key figures in one strip, the first one leading a little larger: in the logo green, or (Light theme
 * option) a white card with a green top edge. Used above the Inventory, Sales and Dashboard figures.
 * figures: [{ label, value, note?, tone?: 'warn' | 'bad' }]
 */
const SummaryStrip = ({ figures }) => {
  const { settings } = useStore();
  const look = settings.theme === 'light' && settings.strip === 'white' ? 'white' : 'green';
  return (
    <div
      style={{ '--cols': `1.3fr repeat(${figures.length - 1}, 1fr)` }}
      className={`grid overflow-hidden rounded-2xl sm:grid-cols-3 lg:grid-cols-(--cols) ${
        look === 'white'
          ? 'glass border border-t-[3px] border-t-evergreen-800 shadow-[0_14px_30px_-18px_rgba(15,74,29,0.35)]'
          : 'brand-gradient shadow-[0_16px_32px_-18px_rgba(15,74,29,0.7)]'
      }`}
    >
      {figures.map((f, i) => (
        <Figure key={f.label} lead={i === 0} look={look} {...f} />
      ))}
    </div>
  );
};

export default SummaryStrip;
