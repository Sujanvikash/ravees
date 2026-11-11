import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext.jsx';

/**
 * Loads one of the admin lists that live on their own pages (`/admin/orders`, `/admin/enquiries`,
 * `/admin/customers`) when the page opens. Answers { items, loading, error, reload, setItems }; `setItems`
 * puts a changed record in place without loading the whole list again.
 */
export const useAdminList = (path) => {
  const { request } = useAdminAuth();
  const [state, setState] = useState({ items: [], loading: true, error: '' });

  const load = useCallback(
    () =>
      request(path).then(
        (items) => setState({ items: items ?? [], loading: false, error: '' }),
        (err) => setState((prev) => ({ ...prev, loading: false, error: err.message }))
      ),
    [request, path]
  );

  useEffect(() => {
    load();
  }, [load]);

  const setItems = useCallback((update) => setState((prev) => ({ ...prev, items: update(prev.items) })), []);

  return { ...state, reload: load, setItems };
};
