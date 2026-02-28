// ─────────────────────────────────────────────────────────────
//  sw.js — SpendTrack Service Worker v5
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'spendtrack-v5';

// Core — must cache or SW install fails
const PRECACHE_CORE = ['/index.html'];

// Optional — skipped silently if 404
const PRECACHE_OPTIONAL = [
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Always fetch fresh from network
const NETWORK_ONLY = [
  '/config.js',
  'googleapis',
  'emailjs'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_CORE).then(function() {
        return Promise.all(
          PRECACHE_OPTIONAL.map(function(url) {
            return cache.add(url).catch(function() {
              console.log('[SW] Optional skip:', url);
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
self.addEventListener('activate', function(e) {
  e.waitUntil(
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
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  var url = e.request.url;

  // Always network for config/third-party
  var networkOnly = NETWORK_ONLY.some(function(p) { return url.indexOf(p) !== -1; });
  if (networkOnly) return;

  if (e.request.mode === 'navigate') {
    // Cache-first for navigation → guarantees offline installability check passes
    e.respondWith(
      caches.match('/index.html').then(function(cached) {
        if (cached) {
          // Refresh in background
          fetch(e.request).then(function(res) {
            caches.open(CACHE_NAME).then(function(c) { c.put('/index.html', res); });
          }).catch(function() {});
          return cached;
        }
        return fetch(e.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put('/index.html', clone); });
          return res;
        });
      })
    );
    return;
  }

  // Cache-first for all other assets
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        return res;
      });
    })
  );
});

// ── SKIP WAITING ─────────────────────────────────────────────
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
