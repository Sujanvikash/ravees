import { inrWhole } from '../lib/money.js';

const SHORTCUTS = [
  ['F2', 'Scan / find'],
  ['F4', 'Customer'],
  ['F8', 'Hold'],
  ['F9', 'Held bills'],
  ['F12', 'Pay'],
  ['Esc', 'Close'],
];

/** The keyboard shortcuts, and today's count and takings at this counter. */
const ShortcutBar = ({ todayCount, todayTotal }) => (
  <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line bg-surface px-4 py-1.5 text-[11px] text-ink-2">
    <div className="flex flex-wrap gap-x-4.5 gap-y-2">
      {SHORTCUTS.map(([key, label]) => (
        <span key={key}>
          <kbd className="font-mono font-bold text-ink">{key}</kbd> {label}
        </span>
      ))}
    </div>
    <div className="flex flex-wrap gap-x-4.5 gap-y-2">
      <span>
        Today: {todayCount} {todayCount === 1 ? 'bill' : 'bills'} · {inrWhole(todayTotal)}
      </span>
      <span>Bills are saved on this computer until the billing server is ready</span>
    </div>
  </footer>
);

export default ShortcutBar;
