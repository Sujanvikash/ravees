import { Link } from 'react-router-dom';
import { Trash2, TriangleAlert } from 'lucide-react';
import IconButton from './IconButton.jsx';
import { useCart } from '../context/CartContext.jsx';

/**
 * The cart lines that can't be bought right now (out of stock, sold only in the stores now, or no longer in the
 * shop), said plainly, with a
 * way to take them out. Shown in the cart, the cart drawer and checkout, which won't take payment while there
 * are any. Renders nothing when every line can be bought.
 *
 * onNavigate  called when a product link is followed (the drawer closes itself)
 */
const UnavailableItems = ({ onNavigate, className = '' }) => {
  const { unavailable, removeFromCart, removeUnavailable } = useCart();
  if (!unavailable.length) return null;
  const one = unavailable.length === 1;

  return (
    <div role="alert" className={`rounded-xl border border-ruby-500/40 bg-ruby-500/8 p-4 ${className}`}>
      <p className="mb-1 flex items-start gap-2 text-[0.88rem] font-semibold text-ruby-500">
        <TriangleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
        {one ? "This item can't be bought right now" : "These items can't be bought right now"}
      </p>
      <p className="mb-2 text-[0.8rem] leading-[1.6] text-text-secondary">
        Remove {one ? 'it' : 'them'} to check out with the rest of your cart.
      </p>

      <ul className="flex list-none flex-col">
        {unavailable.map(({ productId, product, quantity }) => (
          <li key={productId} className="flex items-center gap-3 border-b border-contrast/6 py-2 last:border-0">
            <div className="min-w-0 flex-1 text-[0.85rem]">
              {product ? (
                <Link to={`/product/${product.id}`} onClick={onNavigate} className="text-text-primary no-underline hover:text-gold-300">
                  {product.name}
                </Link>
              ) : (
                <span className="text-text-primary">A product no longer in the shop</span>
              )}
              <span className="text-text-muted">
                {' '}
                × {quantity} · {!product ? 'No longer available' : product.storeOnly ? 'Sold only in our stores' : 'Out of stock'}
              </span>
            </div>
            <IconButton
              variant="remove"
              label={`Remove ${product?.name ?? 'this item'}`}
              onClick={() => removeFromCart(productId)}
              className="p-1.5"
            >
              <Trash2 size={15} strokeWidth={2} />
            </IconButton>
          </li>
        ))}
      </ul>

      {!one && (
        <button
          type="button"
          onClick={removeUnavailable}
          className="mt-2 cursor-pointer border-none bg-transparent p-0 text-[0.82rem] font-semibold text-ruby-500 underline-offset-4 hover:underline"
        >
          Remove them all
        </button>
      )}
    </div>
  );
};

export default UnavailableItems;
