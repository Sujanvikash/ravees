import { LOCATIONS } from '../config.js';

/**
 * DEMO LOGINS ONLY. There is no billing backend yet, so the accounts live in the app: one per showroom
 * plus one admin. Only SHA-256 hashes of "username:password" are stored here, but anyone with the app's
 * code can still get in, so this is not real security. The backend replaces it with server-side logins.
 *
 * Default passwords are "<username>@2026" (chennai@2026 … admin@2026); see README. The admin can set a new
 * password for any login on the Logins page; those hashes are kept in localStorage under PASSWORDS_KEY
 * ({ [username]: { hash, at } }) and win over the defaults, so they only apply on the computer they were set on.
 */
const HASHES = {
  chennai: 'a1ce0061ed3d1910c3b000de99e4a318a2625c8a7e22b8afbb43d685ddef434f',
  bengaluru: 'ffe80a15eee568aac9d293968c5984c76d99afd55e3536636371987e7cde60c5',
  goa: 'dcd1ce388497551d21625926386258b49e7f0f5f7a5561b2570a9dbab0ae4f3c',
  mumbai: '40563d49e0113a4204f6ce71994250dee408d7b1fa3adabe3c68018bdbf2cb35',
  pune: '4d4526be51294f0af26bc7f873588969020f9b992210029abceb4efaef6a197d',
  admin: '3c39a7668fd7047d4c12e10bb154f202b07434db0b009492332267400f768959',
};

/** Who can sign in: each showroom (bills and sees only its own sales) and the admin (sees everything). */
export const ACCOUNTS = [
  ...LOCATIONS.map((l) => ({ username: l.id, label: l.city, role: 'location', location: l.id })),
  { username: 'admin', label: 'Admin', role: 'admin', location: null },
];

const sha256 = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const PASSWORDS_KEY = 'billing-passwords';
export const MIN_PASSWORD = 6;

const changedPasswords = () => {
  try {
    return JSON.parse(window.localStorage.getItem(PASSWORDS_KEY)) ?? {};
  } catch {
    return {};
  }
};

/** The stored entry for a new password: its hash and when it was set. */
export const passwordEntry = async (username, password) => ({
  hash: await sha256(`${username}:${password}`),
  at: new Date().toISOString(),
});

/** Checks a username and password. Returns the session ({ username, role, location }) or null. */
export const signIn = async (username, password) => {
  const account = ACCOUNTS.find((a) => a.username === username);
  if (!account || !password) return null;
  const ok = (await sha256(`${username}:${password}`)) === (changedPasswords()[username]?.hash ?? HASHES[username]);
  return ok ? { username: account.username, role: account.role, location: account.location } : null;
};
