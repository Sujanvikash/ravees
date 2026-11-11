import { Link } from 'react-router-dom';
import { Trash2, ArrowRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import IconButton from '../components/IconButton.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import Price from '../components/Price.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../lib/format.js';
import Eyebrow from '../components/Eyebrow.jsx';
import Aurora from '../components/Aurora.jsx';
import Decoration from '../components/Decoration.jsx';
import { luxuryGiftBoxes } from '../assets/decorations';
import PageTitle from '../components/PageTitle.jsx';
import { cardClass } from '../components/cardClass.js';
import { sectionClass } from '../components/sectionClass.js';

/**
 * The cart page. When every piece has a price it shows the subtotal, delivery and total and goes on to
 * pay online; when any is priced on request (or on backorder) the concierge quotes the whole list instead.
 */
const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, totalCount, payable, subtotal, delivery, total, freeDeliveryOver } =
    useCart();
  const toFreeDelivery = delivery > 0 && freeDeliveryOver > subtotal ? freeDeliveryOver - subtotal : 0;

  return (
    <section className={sectionClass('panel')}>
      <Aurora />
      <div className="mx-auto max-w-275 px-6">
        <Eyebrow>
          ✦ YOUR CART ✦
        </Eyebrow>
        <PageTitle className="mb-5">
          Review Your Selection
        </PageTitle>

        {cart.length === 0 ? (
          <div className={`${cardClass('panel')} flex flex-col items-center gap-4 px-6 py-12 text-center`}>
            <div className="relative isolate h-42.5 w-[min(250px,100%)]">
              <Decoration src={luxuryGiftBoxes} className="inset-0" />
            </div>
            <p className="text-text-secondary">Your cart is empty.</p>
            <Button to="/shop">Browse the Collections</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className={`${cardClass('panel')} flex flex-wrap items-center gap-5 p-5 transition-all hover:border-gold-400/30`}
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gold-400/20 bg-bg-deepest"
                  >
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </Link>

                  <div className="min-w-50 flex-1">
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

                  <Price product={product} quantity={quantity} className="justify-end sm:min-w-28" />

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

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gold-400/30 bg-shade p-6 md:p-8">
              <div className="flex justify-between text-[0.92rem] text-text-secondary">
                <span>Items in list</span>
                <span className="font-mono text-white">{totalCount}</span>
              </div>
              {payable ? (
                <>
                  <div className="flex justify-between text-[0.92rem] text-text-secondary">
                    <span>Subtotal</span>
                    <span className="text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[0.92rem] text-text-secondary">
                    <span>Delivery</span>
                    <span className="text-white">{delivery > 0 ? formatPrice(delivery) : 'Free'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-[1.1rem] font-bold text-white">
                    <span>Total</span>
                    <span className="font-serif text-[1.2rem] text-gold-300">{formatPrice(total)}</span>
                  </div>
                  <p className="text-[0.82rem] leading-[1.6] text-text-muted">
                    Prices include GST.
                    {toFreeDelivery > 0 && ` Add ${formatPrice(toFreeDelivery)} more for free delivery.`}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-[1.1rem] font-bold text-white">
                    <span>Total</span>
                    <span className="font-serif text-[1.2rem] text-gold-300">Quote on request</span>
                  </div>
                  <p className="text-[0.82rem] leading-[1.6] text-text-muted">
                    Some pieces on your list are priced through our concierge, so every quote accounts for size,
                    finish, availability and installation. Submit your list and a specialist confirms pricing and
                    availability.
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                <Button to="/checkout">
                  {payable ? 'Proceed to Checkout' : 'Request Final Quote'}
                  <ArrowRight size={16} strokeWidth={2} />
                </Button>
                <Button variant="outline" to="/shop">
                  Continue Browsing
                </Button>
                <button
                  onClick={clearCart}
                  className="cursor-pointer border-none bg-transparent text-[0.85rem] text-text-muted underline-offset-4 hover:text-danger hover:underline"
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
};

export default Cart;
