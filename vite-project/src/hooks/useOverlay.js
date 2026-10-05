import { useEffect } from 'react';

// Tailwind classes put on <html> while any overlay is open (written out in full so Tailwind finds them).
// - overflow-hidden: the page behind can't scroll. It goes on <html>, not <body>: index.css gives
//   <html> `overflow-x: hidden`, and then `overflow: hidden` on <body> doesn't stop the page.
// - the background: index.css reserves the scrollbar's space (scrollbar-gutter: stable) so the page
//   doesn't jump sideways when locked; a fixed backdrop can't reach into that gap, so the gap gets
//   the backdrop's colour instead of showing a lighter strip.
const LOCK_CLASSES = ['overflow-hidden', 'bg-[#030b07]'];

// How many overlays are open, so closing one doesn't unlock the page while another is still open.
let openCount = 0;

/** While an overlay (modal, drawer) is open: Escape closes it, and the page behind it can't scroll. */
export function useOverlay(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    openCount += 1;
    document.documentElement.classList.add(...LOCK_CLASSES);
    return () => {
      document.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (openCount === 0) document.documentElement.classList.remove(...LOCK_CLASSES);
    };
  }, [open, onClose]);
}
