import { useEffect, useRef, useState } from 'react';

// One observer for the whole page instead of one per element.
const callbacks = new Map();
let observer = null;

const getObserver = () => {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver(
    (entries) => {
      // Siblings that come into view together on one row of a grid get their place along that row, for a
      // left-to-right stagger. Counted per parent AND row (same top edge), so a second row arriving in the
      // same moment starts its own cascade, and unrelated elements don't take a place.
      const counts = new Map();
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const row = `${Math.round(entry.boundingClientRect.top)}`;
        const parent = entry.target.parentElement;
        const slots = counts.get(parent) ?? new Map();
        counts.set(parent, slots);
        const order = slots.get(row) ?? 0;
        slots.set(row, order + 1);
        callbacks.get(entry.target)?.(order);
        callbacks.delete(entry.target);
        observer.unobserve(entry.target);
      }
    },
    // Fires a little before the element is fully on screen, so the reveal feels immediate.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  return observer;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * [ref, inView, order]: inView turns true the first time the element scrolls into view, and stays true.
 * order is its place among the elements that came into view at the same moment (0 if alone).
 * With reduced motion, or without IntersectionObserver, inView is true from the start, so nothing
 * stays hidden waiting for an animation.
 */
export const useInView = () => {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined');
  const [order, setOrder] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (inView || !el || !io) return undefined;
    callbacks.set(el, (place) => {
      setOrder(place);
      setInView(true);
    });
    io.observe(el);
    return () => {
      callbacks.delete(el);
      io.unobserve(el);
    };
  }, [inView]);

  return [ref, inView, order];
};
