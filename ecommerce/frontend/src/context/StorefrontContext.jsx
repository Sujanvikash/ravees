import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { luxuryGiftBoxes } from '../assets/decorations';

/**
 * Everything the storefront shows (`GET /storefront`): the products for sale (every one has a price),
 * categories, showrooms, testimonials and the delivery settings, loaded once per visit. The last copy is kept in localStorage, so a reload paints
 * at once and the fresh copy replaces it when it arrives; if the server can't be reached the saved copy
 * stays on screen. Without one, RootLayout shows a loader, then StorefrontError with a retry.
 */
const StorefrontContext = createContext(null);

const CACHE_KEY = 'raave-storefront';

const readCache = () => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
};

// A product the admin hasn't photographed yet shows wrapped gifts rather than a broken image.
export const NO_PHOTO = luxuryGiftBoxes;

const normalizeProduct = (p) => {
  const image = p.image ?? p.images?.[0] ?? NO_PHOTO;
  return {
    ...p,
    description: p.description ?? '',
    storeOnly: Boolean(p.storeOnly),
    categoryLabel: p.categoryLabel ?? '',
    specs: p.specs ?? [],
    sizes: p.sizes ?? [],
    image,
    images: p.images?.length ? p.images : [image],
  };
};

export const StorefrontProvider = ({ children }) => {
  const [data, setData] = useState(readCache);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api('/storefront', { signal: controller.signal }).then(
      (fresh) => {
        setData(fresh);
        writeCache(fresh);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setLoading(false);
      }
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => {
    // The API only sends products for sale (with a price) and store exclusives; a saved copy from before that
    // rule may still hold price-less ones.
    const products = (data?.products ?? []).filter((p) => p.price != null || p.storeOnly).map(normalizeProduct);
    const byId = new Map(products.map((p) => [p.id, p]));
    // A category without a photo of its own shows its first product's.
    const firstPhoto = (category) => products.find((p) => p.category === category)?.image;
    const showrooms = data?.showrooms ?? [];

    return {
      ready: Boolean(data),
      loading,
      error,
      retry,
      products,
      // "All Collections" leads the list, as the shop's tabs and the category circles expect.
      categories: [
        { id: 'all', name: 'All Collections', icon: '✦', count: products.length, image: (products.find((p) => p.featured) ?? products[0])?.image ?? NO_PHOTO },
        ...(data?.categories ?? []).map((c) => ({ ...c, image: c.image ?? firstPhoto(c.id) ?? NO_PHOTO })),
      ],
      showrooms,
      // Every store in every city, in one list.
      stores: showrooms.flatMap((room) => (room.stores ?? []).map((store) => ({ ...store, city: room.city }))),
      testimonials: data?.testimonials ?? [],
      settings: { deliveryFee: 0, freeDeliveryOver: 0, ...data?.settings },
      productById: (id) => byId.get(id),
    };
  }, [data, loading, error, retry]);

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
};

export const useStorefront = () => {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used within a StorefrontProvider');
  return ctx;
};
