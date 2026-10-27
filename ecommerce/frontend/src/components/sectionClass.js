/**
 * The page's main section: the dark page background, above the fixed decorations (z-20). Three spacings
 * are shared by more than one page:
 *
 *  listing   a little room under the header for a page title (shop, testimonials)
 *  panel     a card or two in the middle of the page (cart, account)
 *  centered  one short message in the middle of the screen (checkout's empty and sent states)
 *
 * Usage: className={sectionClass('panel')}. Pages with their own spacing write the classes out.
 */
const VARIANTS = {
  listing: 'pt-4 pb-10 md:pt-6 md:pb-14',
  panel: 'py-10 md:py-14',
  centered: 'flex min-h-[60vh] items-center justify-center px-6 py-16',
};

export const sectionClass = (variant) => `relative z-20 bg-bg-primary ${VARIANTS[variant]}`;
