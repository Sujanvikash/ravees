import { useSyncExternalStore } from 'react';

/** Which paper a bill prints on: 'thermal' (the 80mm receipt roll) or 'a4'. Chosen per computer (the counter's
 *  printer), kept in this browser, and offered on the sale-complete dialog. */
const KEY = 'billing-bill-paper';
const listeners = new Set();

export const getPaper = () => {
  try {
    return window.localStorage.getItem(KEY) === 'a4' ? 'a4' : 'thermal';
  } catch {
    return 'thermal';
  }
};

export const setPaper = (paper) => {
  try {
    window.localStorage.setItem(KEY, paper);
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
  listeners.forEach((l) => l());
};

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePaper = () => useSyncExternalStore(subscribe, getPaper);
