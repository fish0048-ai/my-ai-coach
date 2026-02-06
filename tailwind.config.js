/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kenney 平台風格：明亮飽和、HUD 感
        primary: {
          50: '#dbeafe',
          100: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
        accent: {
          400: '#4ade80',
          500: '#22c55e',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
        },
        surface: {
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // 平台遊戲專用（附圖 Kenney 風格）
        game: {
          sky: '#87ceeb',
          'sky-dark': '#5ba3c6',
          grass: '#7cb342',
          'grass-dark': '#558b2f',
          earth: '#8d6e63',
          'earth-dark': '#5d4037',
          coin: '#ffd54f',
          'coin-dark': '#ffa000',
          heart: '#ef5350',
          water: '#4fc3f7',
          outline: '#1a1a2e',
          cloud: '#f5f5f5',
        },
      },
      borderRadius: {
        'card': '0.75rem',
        'panel': '1rem',
        'button': '0.5rem',
        'game': '0.5rem',
      },
      boxShadow: {
        'card': '0 4px 0 0 #1a1a2e, 0 6px 6px -1px rgba(0,0,0,0.2)',
        'card-hover': '0 6px 0 0 #1a1a2e, 0 8px 12px -2px rgba(0,0,0,0.25)',
        'glass': '0 18px 45px rgba(15, 23, 42, 0.95)',
        'game-outline': '0 0 0 3px #1a1a2e',
      },
      borderWidth: {
        'game': '3px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fadeIn': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
