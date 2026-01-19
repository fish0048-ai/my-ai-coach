import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // 提高警告閾值到 1000KB（因為已使用 lazy loading）
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 核心庫
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
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
          // 其他工具庫
          if (id.includes('node_modules/buffer') || 
              id.includes('node_modules/fit-file-parser') || 
              id.includes('node_modules/zustand')) {
            return 'utils-vendor';
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
