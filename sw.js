const CACHE_NAME = 'bolao-copa-2026-v2';
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

// Permite que a página force a ativação imediata do novo SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

  // HTML / navegação: network-first, pra nunca travar numa versão antiga
  // (isso cobre tanto requests de navegação quanto './' e './index.html')
  const isHTML =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // offline: cai pro cache
    );
    return;
  }

  // Demais assets locais (css, js, imagens, manifest): cache first, fallback para rede
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
