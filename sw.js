// Rickey AI Agent — Service Worker
// Handles offline caching and PWA install

const CACHE_NAME = 'rickey-ai-v14';
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

// Fetch — network-first for the app shell (so updates show), cache-first for icons
self.addEventListener('fetch', event => {
  // Skip non-GET and external/live calls (never cache these)
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('googleapis.com')) return;
  if (url.includes('anthropic.com')) return;
  if (url.includes('fonts.googleapis.com')) return;
  if (url.includes('workers.dev')) return;          // live rate calls — always network
  if (url.includes('script.google.com')) return;    // Apps Script rate calls
  if (url.includes('nalcoindia.com')) return;
  if (url.includes('corsproxy.io') || url.includes('allorigins')) return;

  const isShell = url.endsWith('/') || url.endsWith('index.html') || url.endsWith('sw.js');

  if (isShell) {
    // NETWORK-FIRST: fetch fresh app, fall back to cache when offline.
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST for static assets (icons, manifest)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
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
