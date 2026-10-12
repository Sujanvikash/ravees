import { RotateCcw } from 'lucide-react';

/**
 * The header row of every admin page: title and subtitle on the left, actions on the right.
 *
 * Props
 *  title       the page title
 *  subtitle    a line under it (counts, "locally edited", a description)
 *  before      something above the title (e.g. a "Back to products" link)
 *  onReset     shows a "Reset" button that discards local edits (pass the collection's reset)
 *  resetLabel  its wording ("Reset to scraped data" by default)
 *  actions     the page's own buttons, after the reset button (e.g. "New product")
 */
const AdminPageHeader = ({ title, subtitle, before, onReset, resetLabel = 'Reset to scraped data', actions }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      {before}
      <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-[0.85rem] text-text-secondary">{subtitle}</p>}
    </div>
    {(onReset || actions) && (
      <div className="flex flex-wrap gap-2.5">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title="Discard local edits and go back to the original data"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-400/25 bg-transparent px-4 py-2.5 text-[0.82rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
          >
            <RotateCcw size={14} strokeWidth={2} />
            {resetLabel}
          </button>
        )}
        {actions}
      </div>
    )}
  </div>
);

export default AdminPageHeader;
