/** One figure on a report: a label, the value, and an optional note under it. `hero` makes it the lead number. */
const StatTile = ({ label, value, note, tone, hero = false }) => (
  <div className={`rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] ${hero ? 'sm:col-span-2' : ''}`}>
    <div className="text-[13px] text-ink-3">{label}</div>
    <div className={`mt-1 font-semibold tracking-tight ${hero ? 'text-5xl' : 'text-2xl'}`}>{value}</div>
    {note && <div className={`mt-1 text-xs ${tone === 'good' ? 'text-ok-ink' : tone === 'bad' ? 'text-ruby-ink' : 'text-ink-3'}`}>{note}</div>}
  </div>
);

export default StatTile;
