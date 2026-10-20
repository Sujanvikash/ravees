/**
 * The site's dark card: a see-through `surface` panel with a thin gold border. Five looks cover every card:
 *
 *  tile    small cards in grids and lists (stats, admin rows, figures)
 *  panel   page sections (cart, checkout, account, empty states, testimonials)
 *  raised  cards that float over the page, with a shadow (sign-in, contact form, showroom details)
 *  glass   more see-through, for cards over photo backgrounds (Why Raave stats, contact rows)
 *  form    the admin "add new" forms, a little more solid and outlined
 *
 * Usage: className={`${cardClass('panel')} p-6`}. Padding and layout stay with the caller.
 */
const VARIANTS = {
  tile: 'rounded-xl border border-gold-400/15 bg-surface/85',
  panel: 'rounded-2xl border border-gold-400/15 bg-surface/85',
  raised: 'rounded-2xl border border-gold-400/25 bg-surface/85 shadow-[0_20px_60px_--alpha(var(--color-black)/60%)]',
  glass: 'rounded-xl border border-gold-400/20 bg-surface/72',
  form: 'rounded-xl border border-gold-400/30 bg-surface/90',
};

export const cardClass = (variant = 'tile') => VARIANTS[variant] ?? VARIANTS.tile;
