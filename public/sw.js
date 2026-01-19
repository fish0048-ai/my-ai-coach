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
    return; // 不攔截，直接使用網路請求
  }
  
  // 跳過 API 請求
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return; // 不攔截，直接使用網路請求
  }
  
  // 其他請求使用快取策略
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});

