
const CACHE = 'cabin-pa-v1';
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const response = await fetch(req);
      if (response.ok && new URL(req.url).pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
        const cache = await caches.open(CACHE);
        cache.put(req, response.clone());
      }
      return response;
    } catch {
      return new Response('오프라인 상태입니다. 저장된 앱 파일만 사용할 수 있습니다.', {
        status: 503,
        headers: {'Content-Type':'text/plain; charset=utf-8'}
      });
    }
  })());
});
