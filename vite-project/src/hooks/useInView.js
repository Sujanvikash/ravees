import { useEffect, useRef, useState } from 'react';

// One observer for the whole page instead of one per element.
const callbacks = new Map();
let observer = null;

function getObserver() {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        observer.unobserve(entry.target);
      }
    },
    // Fires a little before the element is fully on screen, so the reveal feels immediate.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  return observer;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * [ref, inView]: inView turns true the first time the element scrolls into view, and stays true.
 * With reduced motion, or without IntersectionObserver, it is true from the start, so nothing
 * stays hidden waiting for an animation.
 */
export function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (inView || !el || !io) return undefined;
    callbacks.set(el, () => setInView(true));
    io.observe(el);
    return () => {
      callbacks.delete(el);
      io.unobserve(el);
    };
  }, [inView]);

  return [ref, inView];
}
