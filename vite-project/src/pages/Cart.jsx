import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import IconButton from '../components/IconButton.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import { GRADIENT_TITLE } from '../components/SectionHeading.jsx';
import { useCart } from '../context/CartContext.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalCount } = useCart();

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <Aurora />
      <div className="mx-auto max-w-[1100px] px-6">
        <Eyebrow>
          ✦ YOUR CART ✦
        </Eyebrow>
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

                  <QuantityStepper value={quantity} onChange={(next) => updateQuantity(product.id, next)} />

                  <span className="font-serif text-[0.95rem] font-bold text-gold-200">On request</span>

                  <IconButton
                    variant="remove"
                    label={`Remove ${product.name}`}
                    onClick={() => removeFromCart(product.id)}
                    className="p-2"
                  >
                    <Trash2 size={17} strokeWidth={2} />
                  </IconButton>
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
