import { ChevronRight, Menu } from 'lucide-react';

/**
 * The slim bar at the top of every page: the menu button (small screens), a breadcrumb of where you are,
 * and whatever the page puts on the right.
 */
const PageHeader = ({ crumbs, onMenu, children }) => (
  <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 lg:px-5">
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="-ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-mist lg:hidden"
      >
        <Menu size={18} />
      </button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px] whitespace-nowrap">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-line-strong" aria-hidden="true" />}
            <span className={i === crumbs.length - 1 ? 'font-semibold text-ink' : 'text-ink-3'}>{c}</span>
          </span>
        ))}
      </nav>
    </div>
    <div className="flex min-w-0 items-center gap-4 text-[13px] whitespace-nowrap text-ink-3">{children}</div>
  </header>
);

export default PageHeader;
