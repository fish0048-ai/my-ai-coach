import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- 新增：FIT 檔案解析所需的 Buffer Polyfill ---
import { Buffer } from 'buffer';
window.Buffer = Buffer;
// ---------------------------------------------

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)