import { useInView } from '../hooks/useInView.js';

// Stagger steps (class names must be written out in full so Tailwind can find them).
const DELAYS = ['delay-0', 'delay-75', 'delay-150', 'delay-225', 'delay-300', 'delay-375'];

// Where the content starts from before it appears (written out in full so Tailwind can find the classes).
const HIDDEN = { bottom: 'translate-y-6 opacity-0', left: '-translate-x-10 opacity-0' };

/**
 * Fades and moves its content into place the first time it scrolls into view.
 *
 * delay     stagger step for items in a row or grid (0, 1, 2 …; wraps after 6), or 'auto': the item's
 *           place among those that scrolled into view with it, so each grid row cascades left to right
 *           whatever the column count
 * from      where it comes in from: 'bottom' (rises into place, the default) or 'left' (slides in)
 *
 * Once shown it sets `translate: none` (not `0`): any transform left on a wrapper would make
 * it the containing block for position:fixed children (modals, drawers) inside it.
 */
const Reveal = ({ as: Tag = 'div', delay = 0, from = 'bottom', className = '', children, ...rest }) => {
  const [ref, inView, order] = useInView();
  // 'auto' stops at the last step instead of wrapping: a row with more cards than steps would otherwise
  // send its last card back to "no delay", so it finished before the ones beside it.
  const step = delay === 'auto' ? Math.min(order, DELAYS.length - 1) : delay;
  return (
    <Tag
      ref={ref}
      className={`transition-[opacity,translate] duration-700 ease-premium ${DELAYS[step % DELAYS.length]} ${
        inView ? 'translate-none opacity-100' : HIDDEN[from] ?? HIDDEN.bottom
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
