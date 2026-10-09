import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingCart } from 'lucide-react';
import PriceTag from './PriceTag.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';
import { useInView } from '../hooks/useInView.js';

// Round icon buttons over the photo (wishlist, quick view): white discs that read on any photo.
const ACTION_CIRCLE =
  'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-ink/10 bg-white/90 text-ink shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:border-gold-500 hover:bg-gold-400 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500';

/**
 * Product card: a cream card topped by a full-width square photo, a stock badge, the category in gold,
 * the name, the price slot ("Enquire for Price") and one full-width "Add to Cart".
 * The photo and the name open the product page.
 */
const ProductCard = ({ product, onQuickView }) => {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { hoverCard, leaveCard, added, needLogin } = useSanta();
  const addBtnRef = useRef(null);
  const imageRef = useRef(null);
  const wishlisted = isWishlisted(product.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  // The shimmer only runs once the card is on screen, not for every card further down the page.
  const [photoRef, photoInView] = useInView();

  const handleAdd = () => {
    // Santa gives the feedback (speech bubble / sign-in nudge) instead of the toast and redirect.
    if (addToCart(product, { quiet: true, onNeedLogin: needLogin })) added(product, imageRef.current);
  };

  return (
    <div
      onMouseEnter={() => hoverCard(addBtnRef.current)}
      onMouseLeave={leaveCard}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-cream-200 bg-cream-50 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-300 ease-premium hover:-translate-y-1.5 hover:shadow-[0_22px_44px_rgba(0,0,0,0.5),0_0_24px_rgba(229,199,139,0.18)]"
    >
      <Link
        ref={photoRef}
        to={`/product/${product.id}`}
        // Full bleed: the photo spans the card's width, its top corners rounded by the card itself.
        className="relative block aspect-square overflow-hidden bg-white"
      >
        {/* Shimmer placeholder until the photo has loaded; the photo (above it) then covers it. */}
        {!imageLoaded && photoInView && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgba(17,38,27,0.08)_50%,transparent_75%)]"
          />
        )}
        <img
          ref={(el) => {
            imageRef.current = el;
            // Already in the cache: it may have loaded before React attached onLoad.
            if (el?.complete && el.naturalWidth) setImageLoaded(true);
          }}
          src={product.image}
          alt={product.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          className="relative h-full w-full object-cover transition-[scale] duration-[600ms] ease-premium group-hover:scale-[1.06]"
        />
      </Link>

      <span
        className={`absolute top-2.5 left-2.5 rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.02em] text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] sm:text-[0.64rem] ${
          product.inStock ? 'bg-forest' : 'bg-ruby-500'
        }`}
      >
        {product.inStock ? 'In Stock' : 'Backorder'}
      </span>

      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
        <button
          type="button"
          className={`${ACTION_CIRCLE} ${wishlisted ? 'border-ruby-500 text-ruby-500' : ''}`}
          title="Save to wishlist"
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart
            size={14}
            strokeWidth={2}
            fill={wishlisted ? 'currentColor' : 'none'}
            className={wishlisted ? 'animate-pop' : ''}
          />
        </button>
        {onQuickView && (
          <button type="button" className={ACTION_CIRCLE} title="Quick specs & details" onClick={() => onQuickView(product)}>
            <Eye size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 pt-3">
        <span className="mb-1 min-w-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-gold-ink sm:text-[0.64rem] sm:tracking-[0.12em]">
          {product.categoryLabel}
        </span>

        <h3 className="mb-1.5 font-serif text-[0.88rem] font-semibold leading-[1.3] text-ink sm:text-[0.92rem]">
          <Link to={`/product/${product.id}`} className="no-underline transition-colors hover:text-gold-ink">
            {product.name}
          </Link>
        </h3>

        <PriceTag size="sm" compact tone="light" className="mt-auto mb-2" />

        <button
          ref={addBtnRef}
          type="button"
          onClick={handleAdd}
          title="Add to cart"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-forest px-2.5 py-1.5 text-[0.76rem] font-semibold text-cream-50 transition-colors duration-200 hover:bg-forest-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 sm:text-[0.8rem]"
        >
          Add to Cart
          <ShoppingCart size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
