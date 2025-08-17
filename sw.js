// Service Worker for GitHub Pages (project site) — cache-first for static assets,
// network-first for navigation requests with offline fallback to index.html.

// IMPORTANT: register this SW with
//   navigator.serviceWorker.register('./sw.js', { scope: './' });
// and make sure all asset paths in HTML/JS are RELATIVE (./assets/... not /assets/...).

const CACHE_NAME = 'tradesperson-workflow-v2';
const BASE_URL = self.registration.scope; // e.g., https://user.github.io/repo/

// Helper to make absolute URLs relative to the current scope/repo path
const U = (path) => new URL(path, BASE_URL).toString();

// Core files that should always be present
const CORE_ASSETS = [
  U('index.html'),
  U('manifest.json'),
  U('sw.js')
  // Add more specific files below if you know them (e.g., U('assets/app.js'))
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : undefined)))
    ).then(() => self.clients.claim())
  );
});

// Strategy:
// - For navigations (HTML pages): try network first, fall back to cached index.html
// - For same-origin static assets: cache-first, update cache in background
self.addEventListener('fetch', (event) => {
  const req = event.request;

  const isSameOrigin = new URL(req.url).origin === new URL(BASE_URL).origin;
  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally update cached index.html for offline
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(U('index.html'), copy));
          return res;
        })
        .catch(() => caches.match(U('index.html')))
    );
    return;
  }

  if (isSameOrigin) {
    // cache-first for static assets
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Update in background
          fetch(req).then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
  }
});

// Background sync (placeholder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(Promise.resolve()); // replace with real work if needed
  }
});

// Push notifications (placeholder)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const options = {
    body: event.data.text(),
    icon: U('icons/icon-192x192.png'),
    badge: U('icons/icon-72x72.png'),
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
    actions: [
      { action: 'explore', title: 'View', icon: U('icons/checkmark.png') },
      { action: 'close', title: 'Close', icon: U('icons/xmark.png') }
    ]
  };
  event.waitUntil(self.registration.showNotification('Tradesperson Workflow', options));
});
