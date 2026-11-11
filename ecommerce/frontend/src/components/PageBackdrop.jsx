/**
 * A full-bleed background photo behind a page's first section, shown as it is (no wash or fade). Most are
 * dark green, plain where the text sits, so their section must be `theme-dark` (light text); a light one
 * (Contact's ivory) keeps the light palette. The section must be `relative isolate`. The picture is
 * anchored to its right edge, where each dark background keeps its subject (nativity, storefront, doorway),
 * so a narrow screen trims the plain left side first.
 *
 *  align      "right" (default: the subject is on the right) or "center"
 *  light      a light picture: no phone crop (it is plain in the middle anyway, its decoration at the edges)
 *  position   an object-position class that replaces `align`'s, e.g. "object-[40%_center]"
 *  className  a height for the backdrop when the page is much taller than the picture (e.g. "h-[1150px]"):
 *             it then covers the top of the section only, instead of being stretched down the whole page
 */
const PageBackdrop = ({ src, align = 'right', position, light = false, className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute -z-10 overflow-hidden ${className ? `inset-x-0 top-0 ${className}` : 'inset-0'}`}
  >
    {/* Below md the section is narrow and tall, so the photo is enlarged a lot: crop to its plain dark
        middle there, so the text never sits on the bright subject. */}
    <img
      src={src}
      alt=""
      className={`size-full object-cover ${position ?? (align === 'center' ? 'object-center' : 'object-right')} ${light ? '' : 'max-md:object-[38%_center]'}`}
    />
  </div>
);

export default PageBackdrop;
