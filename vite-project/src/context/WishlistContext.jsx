import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from './ToastContext.jsx';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useLocalStorage('raave-wishlist', []);
  const { showToast } = useToast();

  const wishlist = useMemo(() => new Set(ids), [ids]);

  const toggleWishlist = (productId) => {
    setIds((prev) => {
      if (prev.includes(productId)) {
        showToast('Removed from wishlist');
        return prev.filter((id) => id !== productId);
      }
      showToast('Saved to wishlist');
      return [...prev, productId];
    });
  };

  const isWishlisted = (productId) => wishlist.has(productId);

  const value = { wishlist, wishlistCount: ids.length, toggleWishlist, isWishlisted };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
