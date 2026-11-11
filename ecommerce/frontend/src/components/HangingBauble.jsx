import Decoration from './Decoration.jsx';
import { ornamentBauble } from '../assets/decorations';

// The bauble picture is 686×900, its hanging ring at the very top.
const RATIO = 900 / 686;

/**
 * A snowflake bauble hanging on a thin gold string from the top of its section, swaying gently (still with
 * reduced motion). Put it in a section that is a stacking context, like any Decoration.
 *
 * side       when to show it, e.g. "hidden xl:block" (see Decoration)
 * className  where: a left-/right- position (it always hangs from top-0)
 * width      the bauble's width in px
 * drop       the string's length in px, from the section's top edge to the ring
 * delay      seconds into the sway, so neighbouring baubles don't swing in step
 */
const HangingBauble = ({ side, className = '', width = 80, drop = 60, delay = 0 }) => (
  <Decoration
    side={side}
    src={ornamentBauble}
    fade="none"
    imgClassName="object-contain! object-bottom"
    style={{ width, height: drop + width * RATIO, animationDelay: `${-delay}s`, '--drop': `${drop + 4}px` }}
    className={`top-0 origin-top animate-sway motion-reduce:animate-none before:absolute before:top-0 before:left-1/2 before:h-(--drop) before:w-px before:-translate-x-1/2 before:bg-gold-400/70 before:content-[''] ${className}`}
  />
);

export default HangingBauble;
