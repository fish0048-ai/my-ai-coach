import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1000, // 提高警告閾值到 1000KB（因為已使用 lazy loading）
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 和 React-DOM 保留在主 bundle 中，不分離（避免載入順序問題）
          // 如果分離 React，可能導致 vendor chunk 在 React 載入前執行
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return; // 返回 undefined，保留在主 bundle
          }
          // Firebase SDK（通過子模組導入）
          if (id.includes('node_modules/firebase/')) {
            return 'firebase-vendor';
          }
          // MediaPipe（大型依賴，僅在特定頁面使用）
          if (id.includes('node_modules/@mediapipe/')) {
            return 'mediapipe-vendor';
          }
          // PDF 生成（僅在報告功能使用）
          if (id.includes('node_modules/jspdf')) {
            return 'pdf-vendor';
          }
          // Buffer 及其依賴（base64-js, ieee754）保留在主 bundle，避免 chunk 拆分導致
          // base64-js 初始化時 exports 未定義（Ru.byteLength TypeError）
          if (id.includes('node_modules/buffer') ||
              id.includes('node_modules/base64-js') ||
              id.includes('node_modules/ieee754')) {
            return; // 不分離，隨 main 載入
          }
          // fit-file-parser 單獨成 chunk，僅在行事曆／FIT 匯入時載入；不與 zustand 同捆，
          // 避免 production 載入 utils-vendor 時 Buffer/defineProperties 在非物件上執行（Object.defineProperties called on non-object）
          if (id.includes('node_modules/fit-file-parser')) {
            return 'utils-vendor';
          }
          // zustand 保留在主 bundle，避免啟動時載入 utils-vendor 觸發 polyfill 錯誤
          if (id.includes('node_modules/zustand')) {
            return;
          }
          // lucide-react 圖標庫（使用頻繁但較大）
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          // 其他 node_modules 依賴
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.js',
        '**/*.test.jsx',
        '**/__tests__/**',
      ],
    },
  },
})
