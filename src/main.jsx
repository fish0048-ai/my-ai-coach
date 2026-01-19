import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.jsx:import',message:'React imported',data:{reactType:typeof React,reactDOMType:typeof ReactDOM,hasForwardRef:!!React.forwardRef},timestamp:Date.now(),sessionId:'debug-session',runId:'react-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion

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

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.jsx:before-render',message:'Before ReactDOM.render',data:{rootExists:!!document.getElementById('root'),reactForwardRef:!!React.forwardRef},timestamp:Date.now(),sessionId:'debug-session',runId:'react-fix',hypothesisId:'A'})}).catch(()=>{});
// #endregion

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.jsx:render',message:'Rendering app',data:{rootCreated:!!root},timestamp:Date.now(),sessionId:'debug-session',runId:'react-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.jsx:error',message:'Render error',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'react-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.error('Failed to render app:', error);
  document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">應用載入失敗：' + error.message + '</div>';
}