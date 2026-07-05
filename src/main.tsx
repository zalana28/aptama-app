import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register service worker via vite-plugin-pwa (single source of truth)
registerSW({
  onNeedRefresh() {
    // New content available — could show UI prompt to user
  },
  onOfflineReady() {
    // App ready to work offline
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
