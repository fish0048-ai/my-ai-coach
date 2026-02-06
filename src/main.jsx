import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Buffer 由 vite-plugin-node-polyfills 全域注入，fit-file-parser 會使用 window.Buffer

// #region agent log
const _log = (msg, data) => {
  fetch('http://127.0.0.1:7242/ingest/72344403-1b12-4983-948d-82f1cc7f3c6d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'main.jsx', message: msg, data: data || {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
};
window.addEventListener('error', (e) => {
  _log('window.onerror', { message: e.message, stack: e.error?.stack, filename: e.filename });
});
_log('main.jsx start', {});
// #endregion

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