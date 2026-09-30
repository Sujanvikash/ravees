import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, eyebrow, title, size = 'md', children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(2,8,5,0.85)] p-4 backdrop-blur-[16px]"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-[90%] overflow-y-auto rounded-[18px] border border-gold-400/30 bg-bg-dark-emerald shadow-[0_30px_60px_rgba(0,0,0,0.8)] ${
          size === 'lg' ? 'max-w-[980px]' : 'max-w-[860px]'
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
          <button
            className="cursor-pointer border-none bg-transparent text-text-muted transition-colors hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={26} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
