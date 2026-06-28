const CACHE_NAME = 'bolao-copa-2026-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Instala e cacheia os assets principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first para o Firebase e API, cache first para assets locais
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase, API e CDN sempre vai na rede
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('football-data.org') ||
    url.hostname.includes('flagcdn.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets locais: cache first, fallback para rede
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
