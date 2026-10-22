const CACHE_NAME = "selfx-pos-v3";
const ASSETS_TO_CACHE = [
  "/pos",
  "/favicon.ico",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // STRICT RULE: Only intercept requests for the POS terminal (/pos or /api/v1/)
  // All other console pages (/login, /orders, /products, /, etc.) MUST NOT be handled by this SW
  if (!url.pathname.startsWith("/pos") && !url.pathname.startsWith("/api/v1/")) {
    return; // Passthrough directly to network
  }

  // For API endpoints, prefer network first, fallback to offline response if disconnected
  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: {
              code: "network.offline",
              message: "Terminal is operating in offline-first mode. Transaction will queue in IndexedDB.",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // For navigation to /pos: Network First, fallback to cache if offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match("/pos"));
        })
    );
    return;
  }

  // Cache-first strategy ONLY for POS-specific static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/pos");
          }
        });
    })
  );
});
