/**
 * The last products and records a showroom counter loaded, kept in this browser (IndexedDB, which holds far more
 * than localStorage), so the counter still opens when the internet is down. See lib/offline.js.
 */

const DB = 'billing-offline';
const STORE = 'snapshots';

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const inStore = async (mode, fn) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

/** Keeps `value` under `name` for next time; a browser that can't (private window) just doesn't. */
export const keep = (name, value) => inStore('readwrite', (s) => s.put(value, name)).catch(() => {});

/** What was kept under `name`, or undefined. */
export const kept = (name) => inStore('readonly', (s) => s.get(name)).catch(() => undefined);
