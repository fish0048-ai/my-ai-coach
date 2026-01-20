/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 核心主題色：現代健身深色 + 高亮重點色
        primary: {
          50: '#e0f2fe',
          100: '#bae6fd',
          500: '#3b82f6',   // 主按鈕 / 強調文字
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: {
          400: '#22c55e',   // 成功 / Zone2 強調
          500: '#16a34a',
        },
        danger: {
          400: '#f97373',
          500: '#ef4444',
        },
        surface: {
          800: '#111827',   // 卡片背景
          900: '#020617',   // App 主背景
        },
      },
    },
  },
  plugins: [],
}