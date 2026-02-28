// ── Minimal PWA Test Service Worker ──────────────────────────
const CACHE = 'pwa-test-v1';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.add('/index.html');
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  // All navigation requests → serve index.html from cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          return caches.open(CACHE).then(function(c) {
            c.put('/index.html', res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Everything else — network with cache fallback
  e.respondWith(
    fetch(e.request).then(function(res) {
      return caches.open(CACHE).then(function(c) {
        c.put(e.request, res.clone());
        return res;
      });
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
