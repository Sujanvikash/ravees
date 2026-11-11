/**
 * A full-bleed background photo behind a page's first section (the section needs `relative isolate`).
 * The picture is anchored to its right edge, where each background keeps its subject (nativity,
 * storefront, doorway), so a narrow screen trims the empty left side first. Two shades keep text legible:
 *
 *  fade  "left"   washed out on the left (text side), clearing towards the picture on the right
 *        "center" washed out through the middle (centred text), the picture showing at both edges
 *        "frame"  content on both sides (product page): evenly washed, the edges a little clearer
 *
 * and the bottom always melts into the page colour, so the section ends without a hard edge.
 *
 *  align      "right" (default: the subject is on the right) or "center"
 *  className  a height for the backdrop when the page is much taller than the picture (e.g. "h-[1150px]"):
 *             it then covers the top of the section only, instead of being stretched down the whole page
 */
const SHADE = {
  left: 'bg-[linear-gradient(90deg,--alpha(var(--color-shade)/99%)_0%,--alpha(var(--color-shade)/96%)_38%,--alpha(var(--color-shade)/55%)_60%,--alpha(var(--color-shade)/5%)_82%)]',
  center:
    'bg-[radial-gradient(ellipse_70%_80%_at_50%_45%,--alpha(var(--color-shade)/98%)_0%,--alpha(var(--color-shade)/94%)_50%,--alpha(var(--color-shade)/55%)_82%,transparent_100%)]',
  frame:
    'bg-[radial-gradient(ellipse_75%_70%_at_55%_45%,--alpha(var(--color-shade)/97%)_0%,--alpha(var(--color-shade)/92%)_55%,--alpha(var(--color-shade)/70%)_100%)]',
};

const PageBackdrop = ({ src, fade = 'left', align = 'right', className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute -z-10 overflow-hidden ${className ? `inset-x-0 top-0 ${className}` : 'inset-0'}`}
  >
    <img src={src} alt="" className={`size-full object-cover ${align === 'center' ? 'object-center' : 'object-right'}`} />
    <div className={`absolute inset-0 ${SHADE[fade] ?? SHADE.left}`} />
    <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-shade/90 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-bg-primary to-transparent" />
  </div>
);

export default PageBackdrop;
