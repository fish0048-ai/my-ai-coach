import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- 新增：FIT 檔案解析所需的 Buffer Polyfill ---
// 這是為了讓瀏覽器端能夠處理二進位檔案 (Garmin FIT)
import { Buffer } from 'buffer';
window.Buffer = Buffer;
// ---------------------------------------------

// 註冊 Service Worker 支援 PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 忽略註冊錯誤，不影響主流程
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)