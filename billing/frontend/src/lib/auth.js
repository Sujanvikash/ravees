import { activeLocations } from '../config.js';
import { api, setToken } from './api.js';

/**
 * Sign-in goes through the billing API, which keeps the passwords (hashed) and hands back a token. Each login
 * starts with the default password "<username>@2026" (chennai@2026 … admin@2026); the admin can change any of
 * them on the Stores page.
 */

/** Who can sign in: each active store (bills and sees only its own sales) and the admin (sees everything).
 *  Computed on call — the store list loads from the server at start-up, and the admin can add or remove stores. */
export const accounts = () => [
  ...activeLocations().map((l) => ({ username: l.id, label: l.city, area: l.area, role: 'location', location: l.id })),
  { username: 'admin', label: 'Admin', role: 'admin', location: null },
];

/** A demo session works on the demo's own sample data, never on the real sales, stock or orders. */
export const isDemo = (session) => Boolean(session?.demo);

export const MIN_PASSWORD = 6;

/** Checks a username and password with the server. Returns the session ({ username, role, location }); throws
 * an ApiError with a readable message when the password is wrong or the server can't be reached. */
export const signIn = async (username, password) => {
  const { token, session } = await api('/auth/login', { method: 'POST', body: { username, password } });
  setToken(token);
  return session;
};

/** Checks the discount password (one fixed password, not the login's own) before a manual discount. Resolves
 * when it is right; throws an ApiError with a readable message when it is wrong or there were too many tries. */
export const checkPassword = (password) => api('/auth/check-password', { method: 'POST', body: { password } });

/** Checks the Demo switch's password. Resolves when it is right; throws an ApiError with a readable message when it
 *  is wrong or there were too many tries. */
export const unlockDemo = (password) => api('/auth/demo/unlock', { method: 'POST', body: { password } });

/** Signs in to the demo as Chennai Egmore or the admin, with the Demo switch's password. */
export const signInDemo = async (username, password) => {
  const { token, session } = await api('/auth/demo', { method: 'POST', body: { username, password } });
  setToken(token);
  return session;
};

/** Signs out: tells the server, so the admin's Sign-ins page shows when (best effort: the browser forgets the token
 *  either way), and forgets the token. The request takes the token with it before it is dropped. */
export const signOut = () => {
  api('/auth/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
};
