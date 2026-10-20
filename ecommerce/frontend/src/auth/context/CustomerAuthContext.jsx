import { createContext, useContext } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';

/**
 * There is no backend, so "accounts" are just a list in localStorage — shared with
 * nothing else, per browser, like Cart/Wishlist. Passwords are never stored in the
 * clear: they're SHA-256 hashed (salted with the email) via the browser's built-in
 * Web Crypto API before being written down. That's still not real authentication —
 * anyone with devtools access to this browser profile can read the hash list — but
 * it means a look at localStorage doesn't hand over a plaintext password.
 */
const CustomerAuthContext = createContext(null);

const hashPassword = async (password, email) => {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const CustomerAuthProvider = ({ children }) => {
  const [customers, setCustomers] = useLocalStorage('raave-customers', []);
  const [session, setSession] = useLocalStorage('raave-customer-session', null);

  const findByEmail = (email) => customers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());

  const signup = async ({ name, email, phone, password }) => {
    if (!name.trim() || !email.trim() || !password) {
      return { ok: false, error: 'Please fill in your name, email and a password.' };
    }
    if (findByEmail(email)) {
      return { ok: false, error: 'An account with this email already exists — try signing in instead.' };
    }
    const passwordHash = await hashPassword(password, email);
    const customer = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [...prev, customer]);
    setSession({ name: customer.name, email: customer.email, phone: customer.phone });
    return { ok: true };
  };

  const login = async ({ email, password }) => {
    const customer = findByEmail(email);
    if (!customer) return { ok: false, error: 'No account found with that email.' };
    const passwordHash = await hashPassword(password, email);
    if (passwordHash !== customer.passwordHash) return { ok: false, error: 'Incorrect password.' };
    setSession({ name: customer.name, email: customer.email, phone: customer.phone });
    return { ok: true };
  };

  const logout = () => setSession(null);

  const value = { session, isAuthenticated: Boolean(session), signup, login, logout };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  return ctx;
};
