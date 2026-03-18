/**
 * POS Service Worker — Offline support for yard register.
 * Caches product data and critical assets so POS works during brief internet outages.
 */

const CACHE_NAME = "pos-v1";
const PRODUCT_CACHE = "pos-products-v1";

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/yard/register",
  "/logo-elm-blue.webp",
  "/logo-blue.png",
];

// API routes to cache with network-first strategy
const CACHEABLE_APIS = [
  "/api/pos/products",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== PRODUCT_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Product API: network-first with cache fallback
  if (CACHEABLE_APIS.some((api) => url.pathname.startsWith(api))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(PRODUCT_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation requests (HTML pages): network-first
  if (event.request.mode === "navigate" && url.pathname.startsWith("/yard")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/yard/register"))
    );
    return;
  }

  // Static assets: cache-first
  if (event.request.destination === "image" || event.request.destination === "font" ||
      url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
