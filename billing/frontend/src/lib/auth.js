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

/** Signs in to the demo as one of the same logins (a showroom or the admin), with no password. */
export const signInDemo = async (username) => {
  const { token, session } = await api('/auth/demo', { method: 'POST', body: { username } });
  setToken(token);
  return session;
};

export const signOut = () => setToken(null);
