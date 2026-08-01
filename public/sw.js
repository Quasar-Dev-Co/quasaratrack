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
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
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
  var request = event.request;

  // Skip non-GET requests and browser extensions
  if (
    request.method !== "GET" ||
    request.url.startsWith("chrome-extension://") ||
    request.url.includes("extension") ||
    request.url.startsWith("http://localhost:3000/_next/webpack-hmr")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        var clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone).catch(function () {});
        });
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("/").then(function (fallback) {
              return fallback;
            });
          }
          throw new Error("Network error and no cache");
        });
      })
  );
});
