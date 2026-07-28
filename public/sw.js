// ============================================================================
// Service Worker — Mapa Mental Complexo com IA
// ============================================================================
// Estratégia de cache:
//   - App shell (HTML/JS/CSS/fonts): Stale-While-Revalidate (instantâneo + atualiza em background)
//   - Imagens: Cache-First com fallback de rede
//   - API (GET): Network-First com fallback de cache (dados sempre frescos quando online)
//   - POST/PUT/DELETE: Sempre network (nunca cachear escritas)
//
// Permite uso OFFLINE completo depois do primeiro carregamento.
// ============================================================================

const CACHE_VERSION = "v1";
const STATIC_CACHE = `mindmap-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `mindmap-images-${CACHE_VERSION}`;
const API_CACHE = `mindmap-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
];

// ── Install: pré-cachear o app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Falha ao cachear alguns assets:", err);
      })
    )
  );
  self.skipWaiting();
});

// ── Activate: limpar caches antigos ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, IMAGE_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estratégia por tipo de recurso ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorar requisições não-GET (escritas nunca são cacheadas)
  if (request.method !== "GET") return;

  // Ignorar WebSocket e extensões do browser
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Ignorar o serviço de colaboração (WebSocket precisa de conexão em tempo real)
  if (url.pathname.includes("XTransformPort=3003") || url.port === "3003") return;

  // ── API (GET): Network-First ──
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── Imagens: Cache-First ──
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── App shell (HTML, JS, CSS, fonts): Stale-While-Revalidate ──
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ── Estratégias de cache ─────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ── Mensagens do cliente ─────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
