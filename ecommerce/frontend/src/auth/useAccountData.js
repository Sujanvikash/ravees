import { useEffect, useState } from 'react';
import { useCustomerAuth } from './context/CustomerAuthContext.jsx';

/**
 * Loads one of the signed-in customer's API resources (`/orders`, `/orders/<id>`) when the page opens.
 * Answers { data, loading, error, retry }; `data` is null until it arrives.
 */
export const useAccountData = (path) => {
  const { request } = useCustomerAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const key = `${path}#${attempt}`;

  useEffect(() => {
    let live = true;
    request(path).then(
      (data) => live && setResult({ key, data, error: '' }),
      (err) => live && setResult({ key, data: null, error: err.message })
    );
    return () => {
      live = false;
    };
  }, [request, path, key]);

  const current = result.key === key;
  return {
    data: current ? result.data : null,
    error: current ? result.error : '',
    loading: !current,
    retry: () => setAttempt((n) => n + 1),
  };
};
