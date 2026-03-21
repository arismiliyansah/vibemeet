/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          card: '#16213e',
          elevated: '#0f3460',
        },
        accent: {
          DEFAULT: '#e94560',
          hover: '#c73652',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-from-bottom-2': { from: { transform: 'translateY(8px)' }, to: { transform: 'translateY(0)' } },
      },
      animation: {
        'in': 'fade-in 0.15s ease, slide-in-from-bottom-2 0.15s ease',
      },
    },
  },
  plugins: [],
}
