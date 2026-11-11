import { formatPrice } from '../lib/format.js';
import { hasPrice, showsMrp } from '../lib/catalogue.js';

const TONES = {
  // gold on the dark pages
  dark: { price: 'font-serif font-bold text-gold-200', mrp: 'text-text-muted', onRequest: 'font-serif font-bold text-gold-200' },
  // dark ink on the cream product cards
  cream: { price: 'font-bold text-ink', mrp: 'text-ink-soft', onRequest: 'font-medium text-ink-soft' },
};

const SIZES = {
  sm: { price: 'text-[0.86rem]', mrp: 'text-[0.72rem]', onRequest: 'text-[0.76rem]' },
  md: { price: 'text-[0.95rem]', mrp: 'text-[0.78rem]', onRequest: 'text-[0.95rem]' },
  lg: { price: 'text-[1.7rem] leading-none', mrp: 'text-[1rem]', onRequest: 'text-[1.3rem]' },
};

/**
 * A product's price: "₹12,500" with the MRP struck through beside it when that is higher. A product priced
 * by the concierge (priceOnRequest) shows the `onRequest` wording instead; a price is never made up.
 *
 * quantity   multiplies the price and MRP (a cart line's amount)
 * onRequest  the wording for a product without a price ("On request" by default)
 * tone       "dark" (gold, on the dark pages) | "cream" (ink, on the cream product cards)
 * size       "sm" | "md" | "lg"
 */
const Price = ({ product, quantity = 1, onRequest = 'On request', tone = 'dark', size = 'md', className = '' }) => {
  const look = TONES[tone] ?? TONES.dark;
  const scale = SIZES[size] ?? SIZES.md;

  if (!hasPrice(product)) {
    return <span className={`inline-block ${look.onRequest} ${scale.onRequest} ${className}`}>{onRequest}</span>;
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
