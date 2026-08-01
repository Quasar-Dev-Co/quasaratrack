const CACHE_NAME = "quasara-track-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/icon-16.png",
  "/icon-32.png",
  "/icon-48.png",
  "/icon-192.png",
  "/manifest.json",
];

// Install: cache the shell
self.addEventListener("install", (event) => {
  // @ts-ignore
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  // @ts-ignore
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first, fallback to cache, then offline shell
self.addEventListener("fetch", (event) => {
  // @ts-ignore
  const request = event.request;

  // Skip non-GET requests and browser extensions
  if (
    request.method !== "GET" ||
    request.url.startsWith("chrome-extension://") ||
    request.url.includes("extension") ||
    request.url.startsWith("http://localhost:3000/_next/webpack-hmr")
  ) {
    return;
  }

  // @ts-ignore
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("/").then((fallback) => fallback as Response);
          }
          throw new Error("Network error and no cache");
        });
      })
  );
});
