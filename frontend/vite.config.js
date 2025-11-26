import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: '0.0.0.0', // Allow access from outside container
    proxy: {
      '/api': {
        // Use environment variable for Docker, fallback to localhost for local dev
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // Keep /api prefix
      }
    }
  },
  build: {
    // Ensure service worker and manifest are included in build
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  // Public directory for static assets (PWA files)
  publicDir: 'public'
})

