import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { api, readToken, writeToken } from '../../lib/api.js';

/**
 * Customer accounts, kept by the shop API. Signing in gives a token (30 days, or until the password
 * changes), saved in localStorage as `raave-customer-token`; the customer's profile is saved beside it so
 * a reload shows them signed in at once. On load the token is checked with `GET /auth/me`: the profile
 * is refreshed, or both are dropped if the server no longer accepts the token (401).
 *
 * Every action answers `{ ok: true }` or `{ ok: false, error: "a sentence for the person" }`.
 * `request(path, options)` is the API call with the customer's token (when signed in); a 401 signs out.
 */
const CustomerAuthContext = createContext(null);

const TOKEN_KEY = 'raave-customer-token';

// The accounts of the browser-only version (password hashes included): nothing reads them any more.
try {
  window.localStorage.removeItem('raave-customers');
  window.localStorage.removeItem('raave-customer-session');
} catch {
  // storage unavailable: nothing to clean up
}

const failure = (err) => ({ ok: false, error: err.message });

export const CustomerAuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => readToken(TOKEN_KEY));
  const [customer, setCustomer] = useLocalStorage('raave-customer', null);

  const setToken = useCallback((next) => {
    writeToken(TOKEN_KEY, next);
    setTokenState(next);
  }, []);

  const signIn = useCallback(
    ({ token: next, customer: who }) => {
      setToken(next);
      setCustomer(who);
    },
    [setToken, setCustomer]
  );

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
  }, [setToken, setCustomer]);

  // Check the saved token once per visit (and whenever it changes).
  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    api('/auth/me', { token, signal: controller.signal }).then(setCustomer, (err) => {
      if (err.status === 401) logout();
    });
    return () => controller.abort();
  }, [token, setCustomer, logout]);

  const request = useCallback(
    async (path, options = {}) => {
      try {
        return await api(path, { ...options, token });
      } catch (err) {
        if (err.status === 401 && token) {
          logout();
          err.message = 'Your session has ended. Please sign in again.';
        }
        throw err;
      }
    },
    [token, logout]
  );

  const signup = async ({ name, email, phone, password }) => {
    try {
      signIn(await api('/auth/signup', { method: 'POST', body: { name, email, phone, password } }));
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  const login = async ({ email, password }) => {
    try {
      signIn(await api('/auth/login', { method: 'POST', body: { email, password } }));
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  const updateProfile = async ({ name, phone }) => {
    try {
      setCustomer(await request('/auth/me', { method: 'PATCH', body: { name, phone } }));
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  // The account as the server has it now (after a checkout saved the delivery address, say).
  const refreshProfile = useCallback(async () => {
    try {
      setCustomer(await request('/auth/me'));
    } catch {
      // the next page load fetches it anyway
    }
  }, [request]);

  // Forgets the delivery address saved at checkout.
  const forgetAddress = async () => {
    try {
      setCustomer(await request('/auth/me/address', { method: 'DELETE' }));
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  // The server signs other devices out and answers a new token for this one.
  const changePassword = async ({ current, password }) => {
    try {
      const { token: next } = await request('/auth/change-password', { method: 'POST', body: { current, password } });
      setToken(next);
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  // Answers ok whether or not the email has an account (the server doesn't say either).
  const forgotPassword = async ({ email }) => {
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  // The emailed link's token and the new password; signs the customer in.
  const resetPassword = async ({ token: resetToken, password }) => {
    try {
      signIn(await api('/auth/reset-password', { method: 'POST', body: { token: resetToken, password } }));
      return { ok: true };
    } catch (err) {
      return failure(err);
    }
  };

  const value = {
    session: token ? customer : null,
    isAuthenticated: Boolean(token && customer),
    signup,
    login,
    logout,
    updateProfile,
    refreshProfile,
    forgetAddress,
    changePassword,
    forgotPassword,
    resetPassword,
    request,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  return ctx;
};
