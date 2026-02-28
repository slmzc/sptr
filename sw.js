// ─────────────────────────────────────────────────────────────
//  sw.js — SpendTrack Service Worker
//  Caches app shell for offline use; always fetches config.js
//  fresh so Vercel env vars are never stale.
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'spendtrack-v5';

// Core files — MUST exist or SW install fails
const PRECACHE_CORE = [
  '/',
  '/index.html',
  '/?source=pwa',
  '/manifest.json'
];

// Optional files — cached if available, skipped silently if 404
const PRECACHE_OPTIONAL = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Never cache these — always fetch from network
const NETWORK_ONLY = [
  '/config.js',
  'googleapis',
  'emailjs'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Core files must succeed
      return cache.addAll(PRECACHE_CORE).then(function() {
        // Optional files — cache individually, ignore failures
        return Promise.all(
          PRECACHE_OPTIONAL.map(function(url) {
            return cache.add(url).catch(function() {
              console.log('[SW] Optional file not found, skipping:', url);
            });
          })
        );
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore external / config
  if (url.pathname.includes('config.js') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('emailjs')) {
    return;
  }

  // Navigation requests (important for PWA installability)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(function(response) {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Static assets
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );

});

// ── SKIP WAITING (triggered by update banner) ─────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
