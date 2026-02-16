const CACHE_NAME = 'tmux-tuto-v2';

function getBasePath() {
  const scopePath = new URL(self.registration.scope).pathname;
  return scopePath.endsWith('/') ? scopePath : `${scopePath}/`;
}

function getIndexPath() {
  return `${getBasePath()}index.html`;
}

function getPrecachePaths() {
  const base = getBasePath();
  return [base, getIndexPath()];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(getPrecachePaths());
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(getIndexPath()));
    }),
  );
});
