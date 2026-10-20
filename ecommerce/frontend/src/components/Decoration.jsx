import { useState } from 'react';

// Edge fades (index.css): the images are photos with a background, so every edge melts into the page.
const FADES = {
  left: 'deco-fade-left', // pine branch hugging the left edge: fades to the right and bottom
  right: 'deco-fade-right', // mirror of `left`
  oval: 'deco-fade-oval', // soft vignette on all sides
  strip: 'deco-fade-strip', // wide band (garland): fades on all four sides
  under: 'deco-fade-under', // background inside a card: fades out toward the right, under the text
  none: '', // a cut-out with its own transparent background
};

/**
 * A purely decorative image: behind the content, not clickable, ignored by screen readers, loaded lazily,
 * and faded in once it has loaded.
 *
 * Put it inside an element that is a stacking context (every page section here is `relative z-20`, or
 * give a card `relative isolate`): its `-z-10` then sits above that element's background and below its
 * content, like Aurora.
 *
 * src        image (from assets/decorations)
 * fade       which edge fade to use (see FADES)
 * side       a side decoration: it lives in the empty space beside the 1360px content column, so it is
 *            only shown from 1536px wide (2xl), where that space exists. A string instead of `true`
 *            sets a different breakpoint, e.g. "hidden min-[1760px]:block" for a piece needing more room.
 * opacity    final opacity of the picture (backgrounds behind text use ~0.3)
 * className  position and size of the decoration (Tailwind classes)
 * imgClassName  extra classes for the picture, e.g. object-position
 */
const Decoration = ({ src, fade = 'oval', side = false, opacity = 1, className = '', imgClassName = '' }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 ${typeof side === 'string' ? side : side ? 'hidden 2xl:block' : ''} ${className}`}
    >
      <img
        ref={(el) => {
          // Already in the cache: it may have loaded before React attached onLoad.
          if (el?.complete && el.naturalWidth) setLoaded(true);
        }}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? opacity : 0 }}
        className={`h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${FADES[fade]} ${imgClassName}`}
      />
    </div>
  );
};

export default Decoration;
