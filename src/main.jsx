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
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // #region agent log:sw_registration_success
        try {
          fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H4',
              location: 'main.jsx:sw_register',
              message: 'Service Worker registered',
              data: { scope: registration.scope },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {}
        // #endregion agent log:sw_registration_success
      })
      .catch((error) => {
        // #region agent log:sw_registration_error
        try {
          fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H4',
              location: 'main.jsx:sw_register_error',
              message: 'Service Worker registration failed',
              data: { error: error.message },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {}
        // #endregion agent log:sw_registration_error
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)