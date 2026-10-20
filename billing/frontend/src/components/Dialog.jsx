import { X } from 'lucide-react';

/**
 * The modal shell every dialog uses: dimmed backdrop, a white card, a title row with a close button.
 * Esc is handled by the app's keyboard shortcuts, so it is not wired here.
 */
const Dialog = ({ id, title, subtitle, onClose, size = 'max-w-3xl', children }) => (
  <div
    className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-pine-950/55 px-4 pt-16 pb-6 print:hidden"
    onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className={`w-full ${size} overflow-hidden rounded-[20px] bg-surface shadow-[0_30px_80px_rgba(10,33,23,0.35)]`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-bold">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-3">{subtitle}</div>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-10 items-center justify-center rounded-[10px] bg-mist text-ink hover:bg-line"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  </div>
);

export default Dialog;
