import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalCount } = useCart();

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <div className="mx-auto max-w-[1100px] px-6">
        <span className="mb-3 inline-block font-mono text-[0.72rem] uppercase tracking-[0.28em] text-gold-400">
          ✦ YOUR CART ✦
        </span>
        <h1 className={`mb-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.4rem] ${GRADIENT_TITLE}`}>
          Review Your Selection
        </h1>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-6 py-20 text-center">
            <ShoppingBag size={44} strokeWidth={1.5} className="text-gold-400/50" />
            <p className="text-text-secondary">Your cart is empty.</p>
            <Button to="/shop">Browse the Collections</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center gap-5 rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5 transition-all hover:border-gold-400/30"
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gold-400/20 bg-[#020805]"
                  >
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </Link>

                  <div className="min-w-[200px] flex-1">
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-gold-400">
                      {product.categoryLabel}
                    </span>
                    <h3 className="font-serif text-[1.1rem] text-white">
                      <Link to={`/product/${product.id}`} className="no-underline hover:text-gold-200">
                        {product.name}
                      </Link>
                    </h3>
                    {product.sizes.length > 0 && (
                      <span className="text-[0.78rem] text-text-muted">
                        Sizes: {product.sizes.join(' · ')}
                      </span>
                    )}
                  </div>

                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-gold-400/15 bg-white/8">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent text-gold-300 hover:bg-gold-400/20"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="w-10 text-center font-mono text-[0.9rem] text-white">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent text-gold-300 hover:bg-gold-400/20"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>

                  <span className="font-serif text-[0.95rem] font-bold text-gold-200">On request</span>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="flex cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-2 text-text-muted transition-all hover:bg-[rgba(255,92,92,0.15)] hover:text-[#ff5c5c]"
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 size={17} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-gold-400/30 bg-[#04120a] p-6 md:p-8">
              <div className="flex justify-between text-[0.92rem] text-text-secondary">
                <span>Items in list</span>
                <span className="font-mono text-white">{totalCount}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-4 text-[1.1rem] font-bold text-white">
                <span>Total</span>
                <span className="font-serif text-[1.2rem] text-gold-300">Quote on request</span>
              </div>
              <p className="text-[0.82rem] leading-[1.6] text-text-muted">
                Raave&apos;s publishes pricing through its concierge so every quote accounts for size, finish and
                installation. Submit your list and a specialist confirms pricing and availability.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button to="/checkout">
                  Request Final Quote
                  <ArrowRight size={16} strokeWidth={2} />
                </Button>
                <Button variant="outline" to="/shop">
                  Continue Browsing
                </Button>
                <button
                  onClick={clearCart}
                  className="cursor-pointer border-none bg-transparent text-[0.85rem] text-text-muted underline-offset-4 hover:text-[#ff5c5c] hover:underline"
                >
                  Clear list
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
