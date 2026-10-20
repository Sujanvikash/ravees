import { createContext, useContext } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { PRODUCTS } from '../../data/products.js';
import { CATEGORIES } from '../../data/categories.js';
import { SHOWROOMS } from '../../data/showrooms.js';
import { TESTIMONIALS } from '../../data/testimonials.js';

/**
 * Admin edits are stored as a whole-collection override in localStorage. Until a
 * collection is edited it reads straight from the scraped data files, so a re-run of
 * scripts/scrape-site.mjs shows through; once edited, the override wins until reset.
 */
const AdminDataContext = createContext(null);

const useCollection = (key, base, idField = 'id') => {
  const [override, setOverride] = useLocalStorage(`raave-admin-${key}`, null);
  const items = override ?? base;

  const add = (item) => setOverride([...items, item]);

  const update = (id, patch) =>
    setOverride(items.map((item) => (item[idField] === id ? { ...item, ...patch } : item)));

  const remove = (id) => setOverride(items.filter((item) => item[idField] !== id));

  const reset = () => setOverride(null);

  return { items, add, update, remove, reset, isOverridden: override !== null };
};

export const AdminDataProvider = ({ children }) => {
  const products = useCollection('products', PRODUCTS);
  const categories = useCollection('categories', CATEGORIES);
  const showrooms = useCollection('showrooms', SHOWROOMS, 'city');
  const testimonials = useCollection('testimonials', TESTIMONIALS, 'author');

  return (
    <AdminDataContext.Provider value={{ products, categories, showrooms, testimonials }}>
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider');
  return ctx;
};
