const CACHE_NAME = 'my-ai-coach-cache-v4';
const ASSETS = [
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // 強制立即激活新的 Service Worker，取代舊版本
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // 立即控制所有客戶端，確保新 SW 立即生效
  event.waitUntil(
    Promise.all([
      // 刪除所有舊的快取（包括舊版本的 CACHE_NAME）
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => caches.delete(key))
        )
      ),
      // 立即控制所有客戶端
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 導航請求與 index.html 一律走網路，避免舊版 HTML 快取導致引用不存在的 hash 檔案
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    return; // 不攔截，直接走網路
  }

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

