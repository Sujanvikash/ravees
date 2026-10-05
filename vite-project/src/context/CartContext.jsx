import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from './ToastContext.jsx';
import { useRequireLogin } from '../auth/useRequireLogin.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useLocalStorage('raave-cart', []);
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();

  const addToCart = (product) => {
    if (!requireLogin('Please sign in to add items to your cart.')) return false;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" to cart`);
    return true;
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Removed from cart');
  };

  const clearCart = () => setCart([]);

  const totalCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const value = { cart, addToCart, updateQuantity, removeFromCart, clearCart, totalCount };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
