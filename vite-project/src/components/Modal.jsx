import { X } from 'lucide-react';
import { useOverlay } from '../hooks/useOverlay.js';
import IconButton from './IconButton.jsx';

export default function Modal({ open, onClose, eyebrow, title, size = 'md', children }) {
  useOverlay(open, onClose);

  if (!open) return null;

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-1000 flex items-center justify-center bg-[rgba(2,8,5,0.85)] p-4 backdrop-blur-lg transition-opacity duration-300 starting:opacity-0"
      onClick={onClose}
    >
      {/* starting: = the state on the first frame, so it animates in from there on open. */}
      <div
        className={`max-h-[90vh] w-[90%] overflow-y-auto rounded-[18px] border border-gold-400/30 bg-bg-dark-emerald shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-[opacity,scale,translate] duration-500 ease-spring starting:translate-y-4 starting:scale-95 starting:opacity-0 ${
          size === 'lg' ? 'max-w-245' : 'max-w-215'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-7 py-5">
          <div className="flex flex-col gap-1">
            {eyebrow && (
              <span className="font-mono text-[0.68rem] tracking-[0.2em] text-gold-400">{eyebrow}</span>
            )}
            {title && <h3 className="font-serif text-[1.25rem] text-white">{title}</h3>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={26} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
