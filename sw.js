// Rickey AI Agent — Service Worker
// Handles offline caching and PWA install

const CACHE_NAME = 'rickey-ai-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache addAll error (some assets may not exist yet):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => clients.claim())
  );
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET and external API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('googleapis.com')) return;
  if (event.request.url.includes('anthropic.com')) return;
  if (event.request.url.includes('fonts.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline — please reconnect', { status: 503 }));
    })
  );
});

// Push notifications (future use)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Rickey AI', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png'
    })
  );
});
