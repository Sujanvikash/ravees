import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, readToken, upload, writeToken } from '../../lib/api.js';

/**
 * The admin sign-in, checked by the shop API. `POST /admin/login` gives a token (12 hours), saved in
 * localStorage as `raave-admin-token`; on load it is checked with `GET /admin/me` and dropped if the
 * server no longer accepts it.
 *
 * request(path, options)     an API call with the admin token; a 401 signs out
 * uploadImage(file, onProgress)  `POST /admin/images` → { id, url, cardUrl }
 * login / changePassword     answer { ok: true } or { ok: false, error }
 */
const AdminAuthContext = createContext(null);

const TOKEN_KEY = 'raave-admin-token';

// The browser-only demo's sign-in and local edits: nothing reads them any more.
try {
  ['raave-admin-session', 'raave-admin-products', 'raave-admin-categories', 'raave-admin-showrooms', 'raave-admin-testimonials'].forEach(
    (key) => window.localStorage.removeItem(key)
  );
} catch {
  // storage unavailable: nothing to clean up
}

export const AdminAuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => readToken(TOKEN_KEY));
  const [admin, setAdmin] = useState(null);
  const [checkError, setCheckError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const setToken = useCallback((next) => {
    writeToken(TOKEN_KEY, next);
    setTokenState(next);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, [setToken]);

  // A saved token: ask the server who it belongs to (once; signing in answers that already).
  useEffect(() => {
    if (!token || admin) return undefined;
    const controller = new AbortController();
    api('/admin/me', { token, signal: controller.signal }).then(
      (me) => {
        setCheckError('');
        setAdmin(me?.admin ?? me);
      },
      (err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 401 || err.status === 403) logout();
        else setCheckError(err.message);
      }
    );
    return () => controller.abort();
  }, [token, admin, attempt, logout]);

  const retryCheck = useCallback(() => {
    setCheckError('');
    setAttempt((n) => n + 1);
  }, []);

  const signedOut = useCallback(
    (err) => {
      if (err.status === 401) {
        logout();
        err.message = 'Your admin session has ended. Please sign in again.';
      }
      throw err;
    },
    [logout]
  );

  const request = useCallback(
    (path, options = {}) => api(path, { ...options, token }).catch(signedOut),
    [token, signedOut]
  );

  const uploadImage = useCallback(
    (file, onProgress) => upload('/admin/images', file, { token, onProgress }).catch(signedOut),
    [token, signedOut]
  );

  const login = async (username, password) => {
    try {
      const result = await api('/admin/login', { method: 'POST', body: { username: username.trim(), password } });
      setToken(result.token);
      setAdmin(result.admin);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const changePassword = async ({ current, password }) => {
    try {
      const { token: next } = await request('/admin/change-password', { method: 'POST', body: { current, password } });
      setToken(next);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const value = {
    session: admin,
    hasToken: Boolean(token),
    isAuthenticated: Boolean(token && admin),
    checking: Boolean(token && !admin && !checkError),
    checkError,
    retryCheck,
    login,
    logout,
    changePassword,
    request,
    uploadImage,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
};
