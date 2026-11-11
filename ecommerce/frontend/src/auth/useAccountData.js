import { useEffect, useState } from 'react';
import { useCustomerAuth } from './context/CustomerAuthContext.jsx';

/**
 * Loads one of the signed-in customer's API resources (`/orders`, `/orders/<id>`) when the page opens.
 * Answers { data, loading, error, status, retry }; `data` is null until it arrives, `status` is the failed
 * answer's HTTP status (0 when the server couldn't be reached).
 */
export const useAccountData = (path) => {
  const { request } = useCustomerAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '', status: null });
  const key = `${path}#${attempt}`;

  useEffect(() => {
    let live = true;
    request(path).then(
      (data) => live && setResult({ key, data, error: '', status: null }),
      (err) => live && setResult({ key, data: null, error: err.message, status: err.status })
    );
    return () => {
      live = false;
    };
  }, [request, path, key]);

  const current = result.key === key;
  return {
    data: current ? result.data : null,
    error: current ? result.error : '',
    status: current ? result.status : null,
    loading: !current,
    retry: () => setAttempt((n) => n + 1),
  };
};
