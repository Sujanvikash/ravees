import { formatPrice } from '../lib/format.js';
import { showsMrp } from '../lib/catalogue.js';

const TONES = {
  // gold on the dark pages
  dark: { price: 'font-serif font-bold text-gold-200', mrp: 'text-text-muted' },
  // dark ink on the cream product cards
  cream: { price: 'font-bold text-ink', mrp: 'text-ink-soft' },
};

const SIZES = {
  sm: { price: 'text-[0.86rem]', mrp: 'text-[0.72rem]' },
  md: { price: 'text-[0.95rem]', mrp: 'text-[0.78rem]' },
  lg: { price: 'text-[1.7rem] leading-none', mrp: 'text-[1rem]' },
};

/**
 * A product's price: "₹12,500" with the MRP struck through beside it when that is higher ("Price in store" for
 * a store exclusive without one).
 *
 * quantity   multiplies the price and MRP (a cart line's amount)
 * tone       "dark" (gold, on the dark pages) | "cream" (ink, on the cream product cards)
 * size       "sm" | "md" | "lg"
 */
const Price = ({ product, quantity = 1, tone = 'dark', size = 'md', className = '' }) => {
  const look = TONES[tone] ?? TONES.dark;
  const scale = SIZES[size] ?? SIZES.md;

  // A store exclusive may have no online price: its price is given in the store.
  if (product.price == null) {
    return <span className={`${look.price} ${scale.price} ${className}`}>Price in store</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`${look.price} ${scale.price}`}>{formatPrice(product.price * quantity)}</span>
      {showsMrp(product) && (
        <s className={`${look.mrp} ${scale.mrp}`}>
          <span className="sr-only">MRP </span>
          {formatPrice(product.mrp * quantity)}
        </s>
      )}
    </span>
  );
};

export default Price;
