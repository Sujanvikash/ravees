/*
 * The billing app's service worker: keeps the app itself (the page, its scripts and styles, the fonts) in this
 * browser, so a showroom counter still opens when the internet is down. The records it bills from are kept
 * separately (src/lib/snapshots.js), and the API is never touched here: it is on another address.
 *
 *   the page          from the network when it answers (so a new version shows at once), else the kept copy
 *   /assets/…         built files have their hash in the name, so a kept copy never goes stale
 *   other files       the kept copy at once, refreshed in the background (favicon, background, templates)
 *   Google Fonts      the same
 *
 * Registered by src/main.jsx in a production build only.
 */
const CACHE = 'billing-app-v1';
const PAGE = '/';

const assetsIn = (html) => [...new Set(html.match(/\/assets\/[^"'()\s]+/g) ?? [])];

/** Keeps a fresh copy of the page and every built file it names (and the files its scripts and styles name, such
 *  as the logo), and drops built files it no longer needs. */
const keepPage = async (response) => {
  const cache = await caches.open(CACHE);
  const html = await response.clone().text();
  await cache.put(PAGE, response);
  const keepAll = (urls) => Promise.all(urls.map((url) => cache.match(url).then((hit) => hit || cache.add(url).then(() => cache.match(url)))));
  const named = assetsIn(html);
  const files = await keepAll(named);
  const inside = (await Promise.all(files.map((r, i) => (/\.(js|css)$/.test(named[i]) && r ? r.clone().text() : '')))).flatMap(assetsIn);
  const wanted = [...new Set([...named, ...inside])];
  await keepAll(wanted.filter((url) => !named.includes(url)));
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/assets/') && !wanted.includes(path)) await cache.delete(request);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch(PAGE, { cache: 'reload' })
      .then((response) => (response.ok ? keepPage(response) : undefined))
      .then(() => caches.open(CACHE))
      .then((cache) => cache.addAll(['/favicon.png', '/background.jpg']))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const fromCacheFirst = async (request) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
};

const staleWhileRevalidate = async (event) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(event.request);
  const fresh = fetch(event.request).then((response) => {
    if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone());
    return response;
  });
  if (hit) {
    event.waitUntil(fresh.catch(() => {}));
    return hit;
  }
  return fresh;
};

const page = async (event) => {
  try {
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(keepPage(response.clone()).catch(() => {}));
    return response;
  } catch (err) {
    const hit = await caches.match(PAGE);
    if (hit) return hit;
    throw err;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') event.respondWith(page(event));
    else if (url.pathname.startsWith('/assets/')) event.respondWith(fromCacheFirst(request));
    else if (url.pathname !== '/sw.js') event.respondWith(staleWhileRevalidate(event));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event));
  }
});
