import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from './ToastContext.jsx';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [ids, setIds] = useLocalStorage('raave-wishlist', []);
  const { showToast } = useToast();

  const wishlist = useMemo(() => new Set(ids), [ids]);

  const toggleWishlist = (productId) => {
    // The toast stays out of the state updater: React may run an updater twice (StrictMode does in
    // development), which showed every toast twice.
    const saved = wishlist.has(productId);
    setIds((prev) => (saved ? prev.filter((id) => id !== productId) : [...new Set([...prev, productId])]));
    showToast(saved ? 'Removed from wishlist' : 'Saved to wishlist');
  };

  const isWishlisted = (productId) => wishlist.has(productId);

  const value = { wishlist, wishlistCount: ids.length, toggleWishlist, isWishlisted };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
};
