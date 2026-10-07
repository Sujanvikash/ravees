import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, X, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useOverlay } from '../hooks/useOverlay.js';
import Button from '../components/Button.jsx';
import IconButton from '../components/IconButton.jsx';
import QuantityStepper from '../components/QuantityStepper.jsx';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cart, updateQuantity, removeFromCart, totalCount } = useCart();

  useOverlay(isOpen, onClose);

  return (
    <div
      data-lenis-prevent
      className={`fixed inset-0 z-1000 flex justify-end bg-[rgba(2,8,5,0.75)] backdrop-blur-md transition-opacity duration-300 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      onClick={onClose}
    >
      <aside
        className={`flex h-full w-full max-w-[440px] flex-col border-l border-gold-400/30 bg-bg-dark-emerald transition-transform duration-[350ms] ease-premium ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-2.5 text-gold-300">
            <ShoppingBag size={20} strokeWidth={2} />
            <h2 className="font-serif text-[1.15rem] tracking-[0.06em]">Your Cart</h2>
          </div>
          <IconButton label="Close cart" onClick={onClose}>
            <X size={26} />
          </IconButton>
        </div>

        <div className="border-b border-white/10 bg-emerald-500/8 px-6 py-3.5">
          <p className="text-[0.76rem] text-emerald-300">
            Our holiday concierge confirms pricing &amp; availability for every item on your list.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag size={40} strokeWidth={1.5} className="text-gold-400/50" />
              <p className="text-text-secondary">Your cart is empty.</p>
              <Link
                to="/shop"
                onClick={onClose}
                className="text-[0.85rem] text-gold-300 underline-offset-4 hover:underline"
              >
                Browse the collections
              </Link>
            </div>
          ) : (
            cart.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex items-center gap-3.5 rounded-xl border border-gold-400/15 bg-[rgba(4,18,12,0.7)] p-3.5 transition-all duration-300 hover:border-gold-400/30 hover:bg-[rgba(4,18,12,0.9)]"
              >
                <div className="flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold-400/20 bg-[#020805]">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[0.9rem] font-semibold leading-[1.3] text-white">
                      <Link to={`/product/${product.id}`} onClick={onClose} className="no-underline hover:text-gold-200">
                        {product.name}
                      </Link>
                    </h3>
                    <IconButton
                      variant="remove"
                      label={`Remove ${product.name}`}
                      onClick={() => removeFromCart(product.id)}
                      className="p-1"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </IconButton>
                  </div>

                  <p className="text-[0.75rem] text-gold-300">{product.categoryLabel}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper
                      size="sm"
                      value={quantity}
                      onChange={(next) => updateQuantity(product.id, next)}
                    />
                    <span className="font-serif text-[0.9rem] font-bold text-gold-200">On request</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/10 bg-[#04120a] p-6">
            <div className="mb-2.5 flex justify-between text-[0.88rem] text-text-secondary">
              <span>Items</span>
              <span className="font-mono text-white">{totalCount}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-[1.1rem] font-bold text-white">
              <span>Total</span>
              <span className="font-serif text-[1.15rem] text-gold-300">Quote on request</span>
            </div>

            <Button size="lg" full to="/checkout" onClick={onClose} className="mt-3.5">
              Request Final Quote
            </Button>

            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[0.72rem] text-text-muted">
              <ShieldCheck size={13} strokeWidth={2} />
              White-glove delivery across India
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;
