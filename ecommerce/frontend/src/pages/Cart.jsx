import { Link } from 'react-router-dom';
import { Trash2, ArrowRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import IconButton from '../components/IconButton.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';
import Price from '../components/Price.jsx';
import UnavailableItems from '../components/UnavailableItems.jsx';
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
 * The cart page: each line with its quantity and amount, anything that can't be bought right now (out of
 * stock, or gone from the shop) called out, then the subtotal, delivery and total and on to checkout.
 */
const Cart = () => {
  const { cart, unavailable, updateQuantity, removeFromCart, clearCart, totalCount, subtotal, delivery, total, freeDeliveryOver, mrpTotal, discount } = useCart();
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

        {cart.length === 0 && unavailable.length === 0 ? (
          <div className={`${cardClass('panel')} flex flex-col items-center gap-4 px-6 py-12 text-center`}>
            <div className="relative isolate h-42.5 w-[min(250px,100%)]">
              <Decoration src={luxuryGiftBoxes} fade="none" className="inset-0 overflow-hidden rounded-2xl border border-gold-400/25" />
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
                    <h3 className="font-serif text-[1.1rem] text-text-primary">
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

            <UnavailableItems className="mt-4" />

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gold-400/30 bg-shade p-6 md:p-8">
              <div className="flex justify-between text-[0.92rem] text-text-secondary">
                <span>Items in cart</span>
                <span className="font-mono text-text-primary">{totalCount}</span>
              </div>
              {discount > 0 && (
                <>
                  <div className="flex justify-between text-[0.92rem] text-text-secondary">
                    <span>Price (MRP)</span>
                    <span className="text-text-primary">{formatPrice(mrpTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[0.92rem] font-semibold text-emerald-400">
                    <span>Discount</span>
                    <span>&minus;{formatPrice(discount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-[0.92rem] text-text-secondary">
                <span>Subtotal</span>
                <span className="text-text-primary">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[0.92rem] text-text-secondary">
                <span>Delivery</span>
                <span className="text-text-primary">{delivery > 0 ? formatPrice(delivery) : 'Free'}</span>
              </div>
              <div className="flex justify-between border-t border-contrast/10 pt-4 text-[1.1rem] font-bold text-text-primary">
                <span>Total</span>
                <span className="font-serif text-[1.2rem] text-gold-300">{formatPrice(total)}</span>
              </div>
              {discount > 0 && (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-[0.85rem] font-semibold text-emerald-400">
                  You save {formatPrice(discount)} on this order
                </p>
              )}
              <p className="text-[0.82rem] leading-[1.6] text-text-muted">
                Prices include GST.
                {toFreeDelivery > 0 && ` Add ${formatPrice(toFreeDelivery)} more for free delivery.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {cart.length > 0 && (
                  <Button to="/checkout">
                    Proceed to Checkout
                    <ArrowRight size={16} strokeWidth={2} />
                  </Button>
                )}
                <Button variant="outline" to="/shop">
                  Continue Browsing
                </Button>
                <button
                  onClick={clearCart}
                  className="cursor-pointer border-none bg-transparent text-[0.85rem] text-text-muted underline-offset-4 hover:text-danger hover:underline"
                >
                  Clear cart
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
