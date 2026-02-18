const CACHE_VERSION = '__TMUX_TUTO_SW_CACHE_VERSION__';
const CACHE_NAME = `tmux-tuto-${CACHE_VERSION}`;

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
      return Promise.all(
        keys
          .filter((key) => key.startsWith('tmux-tuto-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Always try network for document navigations to avoid stale HTML -> missing hashed assets.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(getIndexPath())),
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
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(getIndexPath()));
    }),
  );
});
