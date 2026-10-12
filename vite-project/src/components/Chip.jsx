/**
 * The site's selectable pill: gold when chosen, dark when not (category tabs, filters, sizes, cities).
 * The style constants are exported for the few places that draw the same states without this button:
 * the Showrooms city row (a gold pill that slides behind the chosen city) and the Tree Studio option cards.
 */
export const CHIP_ACTIVE = 'border-gold-300 bg-gold-500 font-semibold text-on-gold';
// The richer selected look for large option cards: a gold gradient with a soft glow.
export const CHIP_ACTIVE_RICH =
  'border-gold-300 bg-[linear-gradient(135deg,var(--color-gold-300),var(--color-gold-500))] text-on-gold shadow-[0_0_18px_--alpha(var(--color-gold-400)/35%)]';
export const CHIP_GLOW = 'shadow-[0_0_16px_--alpha(var(--color-gold-400)/40%)]';
export const CHIP_IDLE = 'border-gold-400/15 bg-surface/85 text-text-secondary hover:border-gold-400 hover:text-white';
// Unselected on a gold-tinted row (product sizes): gold text instead of grey.
const CHIP_IDLE_GOLD = 'border-gold-400/20 bg-gold-400/8 text-gold-300 hover:border-gold-400';

const SIZES = {
  sm: 'px-4 py-1.5 text-[0.8rem]',
  md: 'px-4 py-2 text-[0.85rem]',
  lg: 'px-5 py-2.5 text-[0.85rem]',
};

/**
 * Props
 *  active     chosen or not (also sets aria-pressed)
 *  size       "sm" | "md" | "lg"
 *  shape      "pill" (round ends) | "box" (rounded corners)
 *  tone       "dark" (grey text when not chosen) | "gold" (gold text when not chosen)
 *  glow       a soft gold glow around the chosen chip
 *  className  layout extras (flex, capitalize, whitespace…)
 */
const Chip = ({ active, size = 'md', shape = 'pill', tone = 'dark', glow = false, className = '', children, ...rest }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`cursor-pointer border transition-all ${shape === 'pill' ? 'rounded-full' : 'rounded-lg'} ${SIZES[size] ?? SIZES.md} ${
      active ? `${CHIP_ACTIVE} ${glow ? CHIP_GLOW : ''}` : tone === 'gold' ? CHIP_IDLE_GOLD : CHIP_IDLE
    } ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default Chip;
