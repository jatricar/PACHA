const CACHE_NAME = "pacha-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API calls (backend) - PACHA's data must always be live/fresh.
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Only handle same-origin requests (the app shell itself: HTML/JS/CSS/icons).
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw err;
      }
    })
  );
});
