const APP_CACHE = "watches-app-v2";
const RUNTIME_CACHE = "watches-runtime-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./utils.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

function canCacheResponse(response) {
  return response && response.status === 200 && ["basic", "cors"].includes(response.type);
}

function offlineResponse() {
  return new Response("Recurso indisponível offline.", {
    status: 503,
    statusText: "Service Unavailable",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (canCacheResponse(response)) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) {
            return cachedPage;
          }
          return caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          if (canCacheResponse(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => offlineResponse());
    })
  );
});
