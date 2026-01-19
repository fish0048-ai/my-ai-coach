import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // 提高警告閾值到 1000KB（因為已使用 lazy loading）
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心庫
          'react-vendor': ['react', 'react-dom'],
          // Firebase SDK（大型依賴）
          'firebase-vendor': ['firebase'],
          // MediaPipe（大型依賴，僅在特定頁面使用）
          'mediapipe-vendor': ['@mediapipe/pose', '@mediapipe/drawing_utils'],
          // PDF 生成（僅在報告功能使用）
          'pdf-vendor': ['jspdf'],
          // 其他工具庫
          'utils-vendor': ['buffer', 'fit-file-parser', 'zustand'],
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
