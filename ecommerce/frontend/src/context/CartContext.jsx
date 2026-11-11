import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from './ToastContext.jsx';
import { useStorefront } from './StorefrontContext.jsx';
import { useRequireLogin } from '../auth/useRequireLogin.js';
import { useCustomerAuth } from '../auth/context/CustomerAuthContext.jsx';
import { hasPrice } from '../lib/catalogue.js';

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
 * storefront data, and a product that is no longer in the catalogue drops out of it.
 *
 * cart          [{ product, quantity }]
 * payable       every item has a price and is in stock, so the cart can be paid for online; otherwise the
 *               checkout sends it to the concierge as a quote request
 * subtotal, delivery, total
 *               rupees; delivery is `settings.deliveryFee`, free once the subtotal reaches `freeDeliveryOver`
 *               (when that is above 0). Only meaningful when payable.
 */
export const CartProvider = ({ children }) => {
  const [saved, setSaved] = useLocalStorage('raave-cart', []);
  const { productById, settings } = useStorefront();
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();
  const { isAuthenticated } = useCustomerAuth();

  const setLines = (update) => setSaved((prev) => update(readLines(prev)));

  const cart = useMemo(
    () =>
      readLines(saved)
        .map(({ productId, quantity }) => ({ product: productById(productId), quantity }))
        .filter((line) => line.product),
    [saved, productById]
  );

  // Returns true when the item was added.
  // quiet: skip the "Added" toast (the caller gives its own feedback, e.g. Santa's speech bubble).
  // onNeedLogin: called instead of the sign-in redirect when signed out; return true if handled.
  const addToCart = (product, { quiet = false, onNeedLogin } = {}) => {
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

  const totals = useMemo(() => {
    const totalCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    const payable = cart.length > 0 && cart.every(({ product }) => hasPrice(product) && product.inStock);
    const subtotal = cart.reduce((sum, { product, quantity }) => sum + (hasPrice(product) ? product.price * quantity : 0), 0);
    const freeOver = Number(settings.freeDeliveryOver) || 0;
    const delivery = cart.length === 0 || (freeOver > 0 && subtotal >= freeOver) ? 0 : Number(settings.deliveryFee) || 0;
    return { totalCount, payable, subtotal, delivery, total: subtotal + delivery, freeDeliveryOver: freeOver };
  }, [cart, settings]);

  const value = { cart, addToCart, updateQuantity, removeFromCart, clearCart, ...totals };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
