import { useEffect } from 'react';

/**
 * While an overlay (modal, drawer) is open: Escape closes it, and the page behind it can't scroll.
 *
 * The lock goes on <html>, not <body>: index.css gives <html> `overflow-x: hidden`, and then
 * `overflow: hidden` on <body> no longer stops the page scrolling. Overlays also carry
 * `data-lenis-prevent`, so Lenis ignores the wheel over them. The previous inline value is
 * restored on close, so nested overlays don't unlock each other.
 */
export function useOverlay(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    document.addEventListener('keydown', onKey);
    root.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = previousOverflow;
    };
  }, [open, onClose]);
}
