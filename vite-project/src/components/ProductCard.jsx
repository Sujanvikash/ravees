import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Info } from 'lucide-react';
import Badge from './Badge.jsx';
import PriceTag from './PriceTag.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const ACTION_CIRCLE =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gold-400/30 bg-[rgba(4,18,12,0.85)] text-gold-300 transition-all duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-[#04120a]';

export default function ProductCard({ product, onQuickView }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(229,199,139,0.15)]">
      <Link to={`/product/${product.id}`} className="relative block h-[280px] w-full overflow-hidden bg-[#020805]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
        />
      </Link>

      {!product.inStock && (
        <div className="absolute top-3.5 left-3.5">
          <Badge variant="ruby">On Backorder</Badge>
        </div>
      )}

      <div className="absolute top-3.5 right-3.5 flex flex-col gap-2">
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

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-gold-400">
            {product.categoryLabel}
          </span>
          <span
            className={`text-[0.72rem] font-medium ${product.inStock ? 'text-emerald-400' : 'text-text-muted'}`}
          >
            {product.inStock ? 'In Stock' : 'Backorder'}
          </span>
        </div>

        <h3 className="mb-2.5 font-serif text-[1.15rem] font-semibold leading-[1.3] text-white">
          <Link to={`/product/${product.id}`} className="no-underline transition-colors hover:text-gold-200">
            {product.name}
          </Link>
        </h3>

        {product.sizes.length > 0 && (
          <div className="mb-3">
            <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Sizes Available:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((size) => (
                <span
                  key={size}
                  className="rounded-md border border-gold-400/15 bg-gold-400/8 px-2 py-0.5 text-[0.72rem] text-gold-300"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        <PriceTag className="mt-auto mb-4" />

        <div className="mt-auto grid grid-cols-[1fr_1.3fr] gap-2.5">
          <Link
            to={`/product/${product.id}`}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gold-400/30 px-3 py-2.5 text-[0.82rem] font-semibold text-gold-300 no-underline transition-all duration-300 hover:bg-gold-400/15 hover:text-white"
          >
            <span>More</span>
            <Info size={14} strokeWidth={2} />
          </Link>
          <button
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-3 py-2.5 text-[0.82rem] font-semibold tracking-[0.04em] text-[#04140b] shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-all duration-300 hover:bg-[linear-gradient(135deg,#fff0c4,var(--color-gold-400))] hover:shadow-[0_0_30px_rgba(229,199,139,0.65)]"
            onClick={() => addToCart(product)}
            title="Add to enquiry cart"
          >
            <ShoppingBag size={16} strokeWidth={2} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
