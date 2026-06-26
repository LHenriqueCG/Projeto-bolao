// ══════════════════════════════════════════════
//  Service Worker — Bolão Copa 2026
// ══════════════════════════════════════════════

const CACHE_NAME = 'bolao-copa-v1';

// Arquivos que serão cacheados na instalação (shell estático)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Fontes do Google (cache na primeira visita via estratégia abaixo)
];

// Domínios externos que devem usar cache (fontes, flags, Firebase SDK)
const CACHE_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'flagcdn.com',
];

// Domínios que NUNCA devem ser cacheados (Firebase Realtime Database / Auth)
const NO_CACHE_DOMAINS = [
  'firebaseio.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Ativa imediatamente sem esperar fechar abas antigas
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Assume controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignora requisições não-GET
  if (request.method !== 'GET') return;

  // 2. Nunca cacheia Firebase (dados em tempo real)
  if (NO_CACHE_DOMAINS.some(d => url.hostname.includes(d))) return;

  // 3. Fontes e assets externos → Cache First (muito raramente mudam)
  if (CACHE_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Arquivos locais (.html, .js, .css, imagens) → Network First
  //    Tenta buscar versão nova, cai no cache se offline
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// ── ESTRATÉGIAS ───────────────────────────────

// Cache First: retorna cache imediatamente; busca na rede só se não tiver
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso indisponível offline.', { status: 503 });
  }
}

// Network First: tenta rede; usa cache se falhar (modo offline)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback para index.html em rotas não encontradas (SPA)
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('./index.html');
    }

    return new Response('Offline — conteúdo não disponível.', { status: 503 });
  }
}
