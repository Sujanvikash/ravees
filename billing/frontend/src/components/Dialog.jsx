import { X } from 'lucide-react';

/**
 * The modal shell every dialog uses: a blurred backdrop, a white panel, a title row with a close button.
 * Esc is handled by the app's keyboard shortcuts, so it is not wired here.
 */
const Dialog = ({ id, title, subtitle, onClose, size = 'max-w-3xl', children }) => (
  <div
    className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-zinc-950/30 px-4 pt-[8vh] pb-6 backdrop-blur-[3px] print:hidden"
    onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className={`w-full ${size} animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-12px_rgba(9,9,11,0.25)]`}
    >
      {title && (
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
          <div>
            <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-3">{subtitle}</div>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-mist hover:text-ink"
            >
              <X size={17} />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  </div>
);

export default Dialog;
