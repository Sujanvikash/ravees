import { LOCATIONS } from '../config.js';
import { api, setToken } from './api.js';

/**
 * Sign-in goes through the billing API, which keeps the passwords (hashed) and hands back a token. Each login
 * starts with the default password "<username>@2026" (chennai@2026 … admin@2026); the admin can change any of
 * them on the Logins page.
 */

/** Who can sign in: each showroom (bills and sees only its own sales) and the admin (sees everything). */
export const ACCOUNTS = [
  ...LOCATIONS.map((l) => ({ username: l.id, label: l.city, role: 'location', location: l.id })),
  { username: 'admin', label: 'Admin', role: 'admin', location: null },
];

/**
 * Demo logins, for people trying the app out: no password, signed in with one click when the Demo switch on the
 * sign-in screen is on. Demo admin sees everything the admin does; Demo store works as the Chennai showroom.
 * Both use the real data, and the server stops them changing passwords.
 */
export const DEMO_ACCOUNTS = [
  { username: 'demo-admin', label: 'Demo admin', role: 'admin', location: null, demo: true },
  { username: 'demo-store', label: 'Demo store', role: 'location', location: 'chennai', demo: true },
];

export const isDemo = (session) => Boolean(session?.username?.startsWith('demo-'));

export const MIN_PASSWORD = 6;

/** Checks a username and password with the server. Returns the session ({ username, role, location }); throws
 * an ApiError with a readable message when the password is wrong or the server can't be reached. */
export const signIn = async (username, password) => {
  const { token, session } = await api('/auth/login', { method: 'POST', body: { username, password } });
  setToken(token);
  return session;
};

/** Signs in to a demo login (no password). */
export const signInDemo = async (username) => {
  const { token, session } = await api('/auth/demo', { method: 'POST', body: { username } });
  setToken(token);
  return session;
};

export const signOut = () => setToken(null);
