import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlay } from '../hooks/useOverlay.js';
import IconButton from './IconButton.jsx';

// A backdrop picture, shown as it is (no wash): the pictures are dark green and plain in the middle, so a
// panel with one uses the dark palette (light text).
const backdropStyle = (src) => ({
  backgroundImage: `url(${src})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

/**
 * Props
 *  eyebrow, title  the header (title as a large serif heading when there is a backdrop)
 *  size            "sm" | "md" | "lg"
 *  backdrop        an image behind the whole panel (e.g. the quick-view festive frame); it stays put while
 *                  the content scrolls
 */
const Modal = ({ open, onClose, eyebrow, title, size = 'md', backdrop, children }) => {
  useOverlay(open, onClose);

  if (!open) return null;

  // Rendered into <body>: inside a page section with its own z-index (e.g. `relative z-20`), z-1000
  // would only count within that section, and the sticky header (z-100) would stay on top of the modal.
  return createPortal(
    <div
      data-lenis-prevent
      className="fixed inset-0 z-1000 flex items-center justify-center bg-scrim p-4 backdrop-blur-lg transition-opacity duration-300 starting:opacity-0"
      onClick={onClose}
    >
      {/* starting: = the state on the first frame, so it animates in from there on open. */}
      <div
        style={backdrop ? backdropStyle(backdrop) : undefined}
        className={`${backdrop ? 'theme-dark' : ''} max-h-[90vh] w-[90%] overflow-y-auto rounded-[18px] border border-gold-400/30 bg-bg-dark-emerald shadow-[0_30px_60px_--alpha(var(--color-shadow)/80%)] transition-[opacity,scale,translate] duration-500 ease-spring starting:translate-y-4 starting:scale-95 starting:opacity-0 ${
          { lg: 'max-w-245', sm: 'max-w-190' }[size] ?? 'max-w-215'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {backdrop ? (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-8">
            <div className="flex min-w-0 flex-col gap-1">
              {eyebrow && <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-gold-300 sm:text-[0.72rem] sm:tracking-[0.22em]">{eyebrow}</span>}
              {title && <h3 className="font-serif text-[1.6rem] font-semibold leading-tight text-text-primary sm:text-[2rem]">{title}</h3>}
            </div>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-contrast/25 bg-shade/60 text-text-primary transition-colors hover:border-gold-400 hover:text-gold-300"
            >
              <X size={22} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-contrast/10 py-3 pr-4 pl-6">
            <div className="flex flex-col gap-0.5">
              {eyebrow && (
                <span className="font-mono text-[0.68rem] tracking-[0.2em] text-gold-400">{eyebrow}</span>
              )}
              {title && <h3 className="font-serif text-[1.25rem] text-text-primary">{title}</h3>}
            </div>
            <IconButton label="Close" onClick={onClose}>
              <X size={26} />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
