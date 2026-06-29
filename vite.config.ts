import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Code-split vendor libraries by domain to keep initial bundle light
          if (id.includes('face-api.js')) return 'face-api'
          if (id.includes('xlsx') || id.includes('jspdf')) return 'export-vendors'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('qrcode.react')) return 'qr'
          if (id.includes('react-router-dom')) return 'router'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
