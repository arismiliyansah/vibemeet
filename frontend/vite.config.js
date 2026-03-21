import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  plugins: [
    react(),
    isDev && mkcert(),
  ].filter(Boolean),

  server: {
    https: isDev,
    port: 5173,
    proxy: isDev
      ? {
          '/socket.io': {
            target: 'http://localhost:3001',
            ws: true,
            secure: false,
          },
        }
      : undefined,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'socket.io-client'],
          mediapipe: ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
})
