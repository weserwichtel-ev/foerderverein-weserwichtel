/**
 * ==============================================================================
 * Service Worker for Weserwichtel Vorstand PWA (v2.0.0)
 * ==============================================================================
 * ZERO-TOUCH REMOTE MAINTENANCE STRATEGY:
 * - Uses NETWORK-FIRST for all HTML/JS/JSON files so that whenever Gaston pushes
 *   a bugfix to GitHub, the Treasurer's browser immediately receives the newest
 *   version without ever needing to clear browser cache!
 * - Falls back to local cache only when offline.
 */

const CACHE_NAME = 'ww-admin-v2.0.0';
const ASSETS_TO_CACHE = [
  './admin.html',
  './admin-anleitung.html',
  './admin.webmanifest',
  './version.json',
  './assets/js/config.js',
  './assets/js/admin.js',
  './assets/img/wichtel-icon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Never intercept Google Apps Script API calls or non-GET requests
  if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
    return;
  }

  // NETWORK-FIRST strategy: Always fetch fresh code from GitHub when online
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request);
      })
  );
});
