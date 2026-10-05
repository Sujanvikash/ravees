import { useState } from 'react';

/**
 * A count that pops when it changes (cart, wishlist).
 *
 * Only real changes pop, not the first render: the count a page loads with is just shown.
 * `bumps` counts changes; keying the span on it remounts the span, which replays the animation.
 * (Comparing with the previous value during render is React's documented pattern for this.)
 */
export default function PopBadge({ count, className = '' }) {
  const [previous, setPrevious] = useState(count);
  const [bumps, setBumps] = useState(0);
  if (count !== previous) {
    setPrevious(count);
    setBumps((n) => n + 1);
  }
  return (
    <span key={bumps} className={`${className} ${bumps > 0 ? 'animate-pop' : ''}`}>
      {count}
    </span>
  );
}
