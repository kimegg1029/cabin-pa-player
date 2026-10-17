const CACHE_NAME = 'cabin-pa-v3';
const APP_ROOT = '/cabin-pa-player/';

self.addEventListener('install', event => {
  // 새 서비스 워커를 즉시 활성화
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 삭제
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith('cabin-pa-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      // 열린 페이지에 새 서비스 워커 적용
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // GET 요청만 처리
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 다른 사이트의 파일은 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 페이지 및 앱 내부 파일은 최신 네트워크 응답 우선
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const freshRequest = new Request(request, {
          cache: 'no-store'
        });

        const response = await fetch(freshRequest);

        // 정상 응답만 캐시에 저장
        if (response && response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        // 인터넷 연결이 안 될 때만 저장된 파일 사용
        const cachedResponse = await cache.match(request);

        if (cachedResponse) return cachedResponse;

        // 홈페이지 오프라인 대체 응답
        if (request.mode === 'navigate') {
          const fallback = await cache.match(APP_ROOT);

          if (fallback) return fallback;
        }

        return new Response(
          '페이지를 불러올 수 없습니다. 인터넷 연결을 확인해 주세요.',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          }
        );
      }
    })()
  );
});
