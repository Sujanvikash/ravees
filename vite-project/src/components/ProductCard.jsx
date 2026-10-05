import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Info } from 'lucide-react';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import PriceTag from './PriceTag.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useSanta } from '../context/SantaContext.jsx';

const ACTION_CIRCLE =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gold-400/30 bg-[rgba(4,18,12,0.85)] text-gold-300 transition-all duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-[#04120a]';

export default function ProductCard({ product, onQuickView }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { hoverCard, leaveCard, flyToBag } = useSanta();
  const addBtnRef = useRef(null);
  const imageRef = useRef(null);
  const wishlisted = isWishlisted(product.id);

  const handleAdd = () => {
    if (addToCart(product)) flyToBag(imageRef.current);
  };

  return (
    <div
      onMouseEnter={() => hoverCard(addBtnRef.current)}
      onMouseLeave={leaveCard}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(229,199,139,0.15)]">
      <Link to={`/product/${product.id}`} className="relative block h-[110px] w-full overflow-hidden bg-[#020805] sm:h-[150px]">
        <img
          ref={imageRef}
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
        />
      </Link>

      {!product.inStock && (
        <div className="absolute top-3 left-3 hidden sm:block">
          <Badge variant="ruby">On Backorder</Badge>
        </div>
      )}

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button
          className={`${ACTION_CIRCLE} ${wishlisted ? 'border-ruby-500 text-ruby-500' : ''}`}
          title="Save to wishlist"
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={16} strokeWidth={2} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
        {onQuickView && (
          <button className={ACTION_CIRCLE} title="Quick specs & details" onClick={() => onQuickView(product)}>
            <Eye size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <span className="min-w-0 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-gold-400 sm:text-[0.68rem] sm:tracking-[0.12em]">
            {product.categoryLabel}
          </span>
          <span
            className={`shrink-0 text-[0.62rem] font-medium sm:text-[0.68rem] ${product.inStock ? 'text-emerald-400' : 'text-text-muted'}`}
          >
            {product.inStock ? 'In Stock' : 'Backorder'}
          </span>
        </div>

        <h3 className="mb-1.5 font-serif text-[0.92rem] font-semibold leading-[1.3] text-white sm:text-[1rem]">
          <Link to={`/product/${product.id}`} className="no-underline transition-colors hover:text-gold-200">
            {product.name}
          </Link>
        </h3>

        {product.sizes.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1" aria-label="Sizes available">
              {product.sizes.map((size) => (
                <span
                  key={size}
                  className="rounded-md border border-gold-400/15 bg-gold-400/8 px-1.5 py-px text-[0.66rem] text-gold-300"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        <PriceTag size="sm" compact className="mt-auto mb-2" />

        <div className="mt-auto grid grid-cols-[1fr_1.3fr] gap-2">
          <Link
            to={`/product/${product.id}`}
            className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-gold-400/30 px-2 py-1.5 text-[0.78rem] sm:gap-1.5 sm:px-3 font-semibold text-gold-300 no-underline transition-all duration-300 hover:bg-gold-400/15 hover:text-white"
          >
            <span>More</span>
            <Info size={14} strokeWidth={2} />
          </Link>
          <Button ref={addBtnRef} size="sm" onClick={handleAdd} title="Add to cart" className="gap-1.5! px-2! py-1.5! sm:gap-2! sm:px-4!">
            <ShoppingBag size={16} strokeWidth={2} />
            <span>Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
