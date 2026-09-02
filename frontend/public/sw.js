const CACHE_NAME = 'dairypro-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept the API — it needs live data (or should fail so the app's
  // own offline-queue logic in useOfflineEntity/OfflineSync takes over).
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Stale-while-revalidate for same-origin static assets/pages, so the shell
  // still loads when there's no connection at all.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
