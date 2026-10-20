import { createContext, useContext } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';

/**
 * Demo-level gate only. There is no backend, so this cannot be real security —
 * anyone with devtools can flip the stored flag. Replace with server-side auth
 * before exposing this dashboard publicly.
 */
const DEMO_USER = 'admin';
const DEMO_PASS = 'raave2026';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [session, setSession] = useLocalStorage('raave-admin-session', null);

  const login = (username, password) => {
    if (username.trim() === DEMO_USER && password === DEMO_PASS) {
      setSession({ username: username.trim(), since: new Date().toISOString() });
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect username or password.' };
  };

  const logout = () => setSession(null);

  return (
    <AdminAuthContext.Provider value={{ session, isAuthenticated: Boolean(session), login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
};

export const DEMO_CREDENTIALS = { username: DEMO_USER, password: DEMO_PASS };
