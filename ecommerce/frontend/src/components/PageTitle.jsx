// White-to-gold gradient lettering for every page and section title.
export const GRADIENT_TITLE =
  'bg-[linear-gradient(135deg,var(--color-white)_0%,var(--color-gold-200)_50%,var(--color-gold-500)_100%)] bg-clip-text text-transparent';

const SIZES = {
  xl: 'text-[1.75rem] leading-[1.15] sm:text-[2.1rem] xl:text-[2.35rem]', // page heroes (Why Raave, Contact)
  lg: 'text-[1.6rem] leading-[1.2] sm:text-[1.95rem]', // section headings, Collections
  md: 'text-[1.6rem] leading-[1.2] sm:text-[1.9rem]', // cart, checkout, account, product, 404
  sm: 'text-[1.55rem] leading-[1.15] sm:text-[1.85rem]', // large panel titles (Tree Studio, Our Purpose)
  xs: 'text-[1.4rem] leading-[1.2]', // card and small section titles, one size on every screen (sign-in, related products)
};

/**
 * A page or section title in the site's serif with the gold gradient.
 *
 * Props
 *  as         the heading level ("h1" by default; SectionHeading uses "h2")
 *  size       "xl" | "lg" | "md" | "sm" | "xs"
 *  className  spacing and layout only (margins, max-width)
 */
const PageTitle = ({ as: Tag = 'h1', size = 'md', className = '', children }) => (
  <Tag className={`font-serif font-bold tracking-[0.02em] ${SIZES[size] ?? SIZES.md} ${GRADIENT_TITLE} ${className}`}>
    {children}
  </Tag>
);

export default PageTitle;
