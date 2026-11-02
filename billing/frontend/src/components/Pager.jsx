import { ChevronLeft, ChevronRight } from 'lucide-react';

const button =
  'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 enabled:hover:bg-mist enabled:hover:text-ink disabled:opacity-40';

/** Page controls under a list (see hooks/usePages.js): "51–100 of 312", previous and next. Hidden when one page holds it all. */
const Pager = ({ page, pages, size, total, setPage, className = 'border-t border-line-soft px-4 py-2' }) => {
  if (pages <= 1) return null;
  const n = (v) => v.toLocaleString('en-IN');
  return (
    <nav aria-label="Pages" className={`flex flex-wrap items-center justify-between gap-2 ${className}`}>
      <span className="text-xs text-ink-3 tabular-nums">
        {n(page * size + 1)}–{n(Math.min(total, (page + 1) * size))} of {n(total)}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={button} disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={15} aria-hidden="true" /> Previous
        </button>
        <span className="px-1 text-xs text-ink-3 tabular-nums">
          Page {page + 1} of {pages}
        </span>
        <button type="button" className={button} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          Next <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default Pager;
