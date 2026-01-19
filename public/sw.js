const CACHE_NAME = 'my-ai-coach-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  // 開發環境：不攔截動態模組和 API 請求
  const url = new URL(event.request.url);
  
  // #region agent log:sw_fetch_request
  try {
    fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'sw.js:fetch',
        message: 'Service Worker fetch event',
        data: {
          url: url.href,
          pathname: url.pathname,
          method: event.request.method,
          mode: event.request.mode,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion agent log:sw_fetch_request
  
  // 跳過開發伺服器請求（localhost / 127.0.0.1）
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return; // 不攔截，直接使用網路請求
  }
  
  // 跳過所有 JavaScript 模組和資源（包括 Vite 構建後的文件）
  // Vite 構建後的文件可能包含 hash，如 main-abc123.js，或放在 /assets/ 目錄
  if (
    url.pathname.match(/\.(js|jsx|ts|tsx|mjs|css|json|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$/i) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/src/')
  ) {
    // #region agent log:sw_skip_module
    try {
      fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'sw.js:skip_module',
          message: 'Skipping module/resource request',
          data: { pathname: url.pathname },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion agent log:sw_skip_module
    return; // 不攔截，直接使用網路請求
  }
  
  // 跳過 API 請求
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return; // 不攔截，直接使用網路請求
  }
  
  // 其他請求使用快取策略
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // #region agent log:sw_cache_hit
        try {
          fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H2',
              location: 'sw.js:cache_hit',
              message: 'Cache hit',
              data: { pathname: url.pathname },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {}
        // #endregion agent log:sw_cache_hit
        return cached;
      }
      return fetch(event.request).catch((error) => {
        // #region agent log:sw_fetch_error
        try {
          fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H3',
              location: 'sw.js:fetch_error',
              message: 'Fetch error',
              data: { pathname: url.pathname, error: error.message },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {}
        // #endregion agent log:sw_fetch_error
        throw error;
      });
    })
  );
});

