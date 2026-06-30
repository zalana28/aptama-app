import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'logos/aptama-logo.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: {
        id: '/',
        name: 'APTAMA Absensi',
        short_name: 'APTAMA',
        description:
          'Aplikasi Daftar Hadir Kegiatan Kepemudaan APTAMA untuk kegiatan bersih sampah.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0F0D',
        theme_color: '#1B7A3D',
        categories: ['productivity', 'utilities', 'education'],
        lang: 'id-ID',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Beranda APTAMA',
          },
          {
            src: '/screenshots/scan-qr.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Scan QR Absensi',
          },
          {
            src: '/screenshots/rekap.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Rekap Absensi',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Jangan cache Supabase API
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/models\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-api-models',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
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
