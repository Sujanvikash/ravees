import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from './ToastContext.jsx';
import { useStorefront } from './StorefrontContext.jsx';
import { useRequireLogin } from '../auth/useRequireLogin.js';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { canBuy, showsMrp } from '../lib/catalogue.js';

const CartContext = createContext(null);

/**
 * The saved cart is `[{ productId, quantity }]`; older carts saved whole product objects
 * (`{ product, quantity }`), which are read as their ids.
 */
const readLines = (saved) =>
  (Array.isArray(saved) ? saved : [])
    .map((line) => ({ productId: line.productId ?? line.product?.id, quantity: Number(line.quantity) || 1 }))
    .filter((line) => line.productId);

/**
 * The cart, saved in this browser. What it shows (name, price, photo) is always the current product from the
 * storefront data.
 *
 * cart          [{ product, quantity }]: the lines that can be bought (the product is on sale and in stock)
 * unavailable   [{ productId, product, quantity }]: lines that can't be bought now, because the product is
 *               out of stock or now sold only in the stores (`product` set) or no longer in the shop (`product`
 *               null). Checkout won't take payment until they are removed (`removeUnavailable`).
 * subtotal, delivery, total
 *               rupees for `cart`; delivery is `settings.deliveryFee`, free once the subtotal reaches
 *               `freeDeliveryOver` (when that is above 0)
 * mrpTotal, discount
 *               the same lines at their MRPs (where the MRP is above the price), and what the customer saves
 * totalCount    pieces in the cart, unavailable ones included (the header badge, Santa's sack)
 */
export const CartProvider = ({ children }) => {
  const [saved, setSaved] = useLocalStorage('raave-cart', []);
  const { productById, settings } = useStorefront();
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();
  const { isAuthenticated } = useCustomerAuth();

  const setLines = (update) => setSaved((prev) => update(readLines(prev)));

  const { cart, unavailable } = useMemo(() => {
    const lines = readLines(saved).map(({ productId, quantity }) => ({ productId, product: productById(productId) ?? null, quantity }));
    return {
      cart: lines.filter((line) => canBuy(line.product)).map(({ product, quantity }) => ({ product, quantity })),
      unavailable: lines.filter((line) => !canBuy(line.product)),
    };
  }, [saved, productById]);

  // Returns true when the item was added.
  // quiet: skip the "Added" toast (the caller gives its own feedback, e.g. Santa's speech bubble).
  // onNeedLogin: called instead of the sign-in redirect when signed out; return true if handled.
  const addToCart = (product, { quiet = false, onNeedLogin } = {}) => {
    if (product.storeOnly) {
      showToast(`"${product.name}" is a store exclusive: find it in our stores`);
      return false;
    }
    if (!product.inStock) {
      showToast(`"${product.name}" is out of stock`);
      return false;
    }
    if (!isAuthenticated && onNeedLogin?.()) return false;
    if (!requireLogin('Please sign in to add items to your cart.')) return false;
    setLines((lines) =>
      lines.some((line) => line.productId === product.id)
        ? lines.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...lines, { productId: product.id, quantity: 1 }]
    );
    if (!quiet) showToast(`Added "${product.name}" to cart`);
    return true;
  };

  const removeFromCart = (productId) => {
    setLines((lines) => lines.filter((line) => line.productId !== productId));
    showToast('Removed from cart');
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setLines((lines) => lines.map((line) => (line.productId === productId ? { ...line, quantity: newQty } : line)));
  };

  const clearCart = () => setSaved([]);

  const removeUnavailable = () => {
    const gone = new Set(unavailable.map((line) => line.productId));
    setLines((lines) => lines.filter((line) => !gone.has(line.productId)));
  };

  const totals = useMemo(() => {
    const totalCount = [...cart, ...unavailable].reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = cart.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
    const mrpTotal = cart.reduce((sum, { product, quantity }) => sum + (showsMrp(product) ? product.mrp : product.price) * quantity, 0);
    const freeOver = Number(settings.freeDeliveryOver) || 0;
    const delivery = cart.length === 0 || (freeOver > 0 && subtotal >= freeOver) ? 0 : Number(settings.deliveryFee) || 0;
    return { totalCount, subtotal, mrpTotal, discount: mrpTotal - subtotal, delivery, total: subtotal + delivery, freeDeliveryOver: freeOver };
  }, [cart, unavailable, settings]);

  const value = { cart, unavailable, addToCart, updateQuantity, removeFromCart, removeUnavailable, clearCart, ...totals };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
