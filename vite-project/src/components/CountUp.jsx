import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useInView.js';

/**
 * Counts from 0 up to `value` the first time it scrolls into view.
 * Writes the number straight into the element, so counting doesn't re-render React.
 * With reduced motion (useInView reports "in view" at once) it shows the final number.
 */
const CountUp = ({ value, duration = 1400, suffix = '', className = '' }) => {
  const [ref, inView] = useInView();
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const final = `${value.toLocaleString('en-IN')}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced) return undefined;
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      el.textContent = `${Math.round(value * eased).toLocaleString('en-IN')}${suffix}`;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value, duration, suffix, ref]);

  // Screen readers get the real number, not the ticking one. React always renders the starting
  // text ("0"), and the effect counts it up; rendering the final number on the in-view render
  // painted it for a frame before the count started.
  return (
    <span className={className} aria-label={final}>
      <span ref={ref} aria-hidden="true">
        {reduced ? final : `0${suffix}`}
      </span>
    </span>
  );
};

export default CountUp;
