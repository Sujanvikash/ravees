/**
 * A full-bleed background photo behind a page's first section (the section needs `relative isolate`).
 * The picture is anchored to its right edge, where each background keeps its subject (nativity,
 * storefront, doorway), so a narrow screen trims the empty left side first. Two shades keep text legible:
 *
 *  fade  "left"   dark on the left (text side), clearing towards the picture on the right
 *        "center" dark through the middle (centred text), the picture showing at both edges
 *
 * and the bottom always melts into the page colour, so the section ends without a hard edge.
 */
const SHADE = {
  left: 'bg-[linear-gradient(90deg,rgba(4,15,10,0.94)_0%,rgba(4,15,10,0.82)_32%,rgba(4,15,10,0.35)_58%,rgba(4,15,10,0.05)_78%)]',
  center:
    'bg-[radial-gradient(ellipse_70%_80%_at_50%_45%,rgba(4,15,10,0.92)_0%,rgba(4,15,10,0.78)_45%,rgba(4,15,10,0.25)_80%,transparent_100%)]',
};

const PageBackdrop = ({ src, fade = 'left' }) => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <img src={src} alt="" className="size-full object-cover object-right" />
    <div className={`absolute inset-0 ${SHADE[fade] ?? SHADE.left}`} />
    <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[rgba(4,15,10,0.7)] to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-bg-primary to-transparent" />
  </div>
);

export default PageBackdrop;
