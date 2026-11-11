import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import PageLoader from '../../components/PageLoader.jsx';
import Button from '../../components/Button.jsx';
import { useAdminAuth } from './AdminAuthContext.jsx';

/**
 * The catalogue, showrooms and testimonials as the admin edits them, from the shop API: `GET /admin/catalogue`
 * (every category and product, hidden ones too), `GET /admin/showrooms` and `GET /admin/testimonials`.
 * Each collection is { items, create(body), update(id, patch), remove(id), reorder(ids) }; every change is
 * sent to the server and the collection is then loaded again, so the page shows what the server holds.
 * The changes throw the server's message when it says no (e.g. a category that still has products).
 * Orders, enquiries and customers are loaded by their own pages (useAdminList). AdminDataGate (around the
 * pages, inside the layout) shows a loader until the first load is in, or the error with a retry.
 */
const AdminDataContext = createContext(null);

/** `items` in the order of `ids` (the new order is shown before the server has answered). */
const inOrder = (items, ids) => {
  const position = new Map(ids.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity));
};

export const AdminDataProvider = ({ children }) => {
  const { request } = useAdminAuth();
  const [catalogue, setCatalogue] = useState(null);
  const [showrooms, setShowrooms] = useState(null);
  const [testimonials, setTestimonials] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const loadCatalogue = useCallback(() => request('/admin/catalogue').then(setCatalogue), [request]);
  const loadShowrooms = useCallback(() => request('/admin/showrooms').then(setShowrooms), [request]);
  const loadTestimonials = useCallback(() => request('/admin/testimonials').then(setTestimonials), [request]);

  useEffect(() => {
    Promise.all([loadCatalogue(), loadShowrooms(), loadTestimonials()]).then(
      () => setError(''),
      (err) => setError(err.message)
    );
  }, [loadCatalogue, loadShowrooms, loadTestimonials, attempt]);

  const collection = (items, base, reload, setItems) => ({
    items,
    create: async (body) => {
      const made = await request(base, { method: 'POST', body });
      await reload();
      return made;
    },
    update: async (id, patch) => {
      const saved = await request(`${base}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
      await reload();
      return saved;
    },
    remove: async (id) => {
      await request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await reload();
    },
    reorder: async (ids) => {
      setItems((list) => inOrder(list, ids));
      try {
        await request(`${base}/order`, { method: 'PUT', body: { ids } });
      } finally {
        await reload(); // the server's order either way (puts it back if the move was refused)
      }
    },
  });

  const value = {
    ready: Boolean(catalogue && showrooms && testimonials),
    error,
    retry: () => {
      setError('');
      setAttempt((n) => n + 1);
    },
    products: collection(catalogue?.products ?? [], '/admin/products', loadCatalogue, (fn) =>
      setCatalogue((prev) => ({ ...prev, products: fn(prev.products) }))
    ),
    categories: collection(catalogue?.categories ?? [], '/admin/categories', loadCatalogue, (fn) =>
      setCatalogue((prev) => ({ ...prev, categories: fn(prev.categories) }))
    ),
    showrooms: collection(showrooms ?? [], '/admin/showrooms', loadShowrooms, (fn) => setShowrooms((prev) => fn(prev))),
    testimonials: collection(testimonials ?? [], '/admin/testimonials', loadTestimonials, (fn) => setTestimonials((prev) => fn(prev))),
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
};

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider');
  return ctx;
};

/** Shows the admin pages once the catalogue, showrooms and testimonials are in. */
export const AdminDataGate = ({ children }) => {
  const { ready, error, retry } = useAdminData();
  if (ready) return children;
  if (!error) return <PageLoader label="Loading the shop" />;
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="max-w-[420px] text-[0.92rem] text-text-secondary">{error}</p>
      <Button size="sm" onClick={retry}>
        <RotateCw size={15} strokeWidth={2} />
        Try again
      </Button>
    </div>
  );
};
